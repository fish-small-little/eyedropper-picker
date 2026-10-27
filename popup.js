'use strict';

/**
 * 取色器 · popup 逻辑
 *
 * 两种运行形态：
 * 1) action 弹窗（点工具栏图标直接打开，宽 340px）
 *    点「开始取色」时，不能在本弹窗里直接调用 EyeDropper ——
 *    因为 EyeDropper 一旦启动，浏览器会把焦点交给取色层，弹窗会被系统关掉，
 *    取色结果就丢了。所以这里改为打开一个小号的独立窗口（mode=window）来完成取色。
 * 2) 独立取色窗口（宽 420px，chrome.windows.create 打开）
 *    在这里调用 EyeDropper，窗口不会因失焦而关闭，取色后能立刻展示色值并自动复制。
 */

const params = new URLSearchParams(location.search);
const isDetached = params.get('mode') === 'window';

const $ = (id) => document.getElementById(id);
const els = {
  swatch: $('swatch'),
  swatchText: $('swatchText'),
  hexValue: $('hexValue'),
  rgbValue: $('rgbValue'),
  pickBtn: $('pickBtn'),
  pickBtnText: $('pickBtnText'),
  copyBtn: $('copyBtn'),
  tip: $('tip'),
  subHint: $('subHint'),
  closeBtn: $('closeBtn'),
};

/** 当前浏览器是否支持 EyeDropper API（Chrome 95+ / Edge 95+） */
const SUPPORTED = typeof window.EyeDropper === 'function';

/** 当前已取到的颜色（HEX） */
let currentHex = '';

/* ---------------- 工具函数 ---------------- */

/** HEX 转 RGB 对象，如 #F5A524 -> { r: 245, g: 165, b: 36 } */
function hexToRgb(hex) {
  const value = hex.replace('#', '');
  return {
    r: parseInt(value.slice(0, 2), 16),
    g: parseInt(value.slice(2, 4), 16),
    b: parseInt(value.slice(4, 6), 16),
  };
}

/** 根据背景亮度决定文字用深色还是浅色，保证对比度 */
function textColorFor(hex) {
  const { r, g, b } = hexToRgb(hex);
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  return luminance > 0.6 ? '#1a1d21' : '#ffffff';
}

/** 更新状态提示文字 */
function setTip(text, type) {
  els.tip.textContent = text;
  els.tip.className = 'tip' + (type ? ' ' + type : '');
}

/** 把取到的颜色渲染到预览区 */
function showColor(hex) {
  currentHex = hex.toUpperCase();
  const { r, g, b } = hexToRgb(currentHex);

  els.swatch.style.backgroundColor = currentHex;
  els.swatch.classList.add('has-color');
  els.swatchText.textContent = currentHex;
  els.swatchText.style.color = textColorFor(currentHex);

  els.hexValue.textContent = currentHex;
  els.rgbValue.textContent = `rgb(${r}, ${g}, ${b})`;
  els.copyBtn.disabled = false;
}

/** 写入剪贴板；失败时抛出异常由调用方处理 */
async function copyToClipboard(text) {
  // 取色结束后窗口可能短暂失焦，先抢回焦点再写剪贴板，成功率更高
  if (typeof window.focus === 'function') window.focus();
  await navigator.clipboard.writeText(text);
}

/* ---------------- 核心：取色 ---------------- */

async function pickColor() {
  if (!SUPPORTED) {
    setTip('当前浏览器不支持 EyeDropper API，请使用 Chrome 95+ 或 Edge 95+', 'err');
    return;
  }

  els.pickBtn.disabled = true;
  els.pickBtnText.textContent = '取色中…';
  setTip('把鼠标移到屏幕上任意位置，单击即可取色；按 ESC 取消');

  try {
    const dropper = new EyeDropper();
    const result = await dropper.open(); // 用户按 ESC 时这里会抛出 AbortError
    const hex = result.sRGBHex;

    showColor(hex);
    els.pickBtnText.textContent = '再取一次';

    // 自动复制到剪贴板
    try {
      await copyToClipboard(hex);
      setTip(`已取到 ${hex}，并已复制到剪贴板`, 'ok');
    } catch (copyErr) {
      setTip(`已取到 ${hex}，但自动复制被浏览器拦截，请点下方「复制色值」`, 'warn');
    }
  } catch (err) {
    if (err && err.name === 'AbortError') {
      setTip('已取消本次取色', 'warn');
    } else {
      setTip('取色失败：' + (err && err.message ? err.message : String(err)), 'err');
    }
    els.pickBtnText.textContent = currentHex ? '再取一次' : '开始取色';
  } finally {
    els.pickBtn.disabled = false;
  }
}

/* ---------------- 事件绑定 ---------------- */

function bindEvents() {
  // 主按钮
  els.pickBtn.addEventListener('click', () => {
    if (!isDetached) {
      // action 弹窗里：打开独立取色窗口，再关掉自己，避免弹窗被 EyeDropper 顶掉
      if (typeof chrome !== 'undefined' && chrome.windows) {
        chrome.windows.create({
          url: chrome.runtime.getURL('popup.html?mode=window'),
          type: 'popup',
          width: 420,
          height: 560,
          focused: true,
        });
        window.close();
      } else {
        // 非扩展环境（例如本地直接打开 HTML 预览）时，退化为直接取色
        pickColor();
      }
      return;
    }
    pickColor();
  });

  // 手动复制
  els.copyBtn.addEventListener('click', async () => {
    if (!currentHex) return;
    try {
      await copyToClipboard(currentHex);
      setTip(`已复制 ${currentHex} 到剪贴板`, 'ok');
    } catch (err) {
      setTip('复制失败，请手动选中色值后按 Ctrl+C', 'warn');
    }
  });

  // 独立窗口的关闭按钮
  els.closeBtn.addEventListener('click', () => window.close());
}

/* ---------------- 初始化 ---------------- */

function init() {
  if (isDetached) {
    document.body.classList.add('detached');
    els.closeBtn.hidden = false;
    els.subHint.textContent = '取色窗口已打开。点击下方按钮，鼠标会变成十字准星，单击屏幕上任意位置即可取色。';
    els.pickBtn.focus(); // 让按钮直接可用，回车即可开始
  } else {
    els.subHint.textContent = '点击「开始取色」会打开一个小窗口，在窗口里点按钮即可吸取屏幕上任意位置的颜色。';
  }

  if (!SUPPORTED) {
    els.pickBtn.disabled = true;
    els.pickBtnText.textContent = '浏览器不支持';
    els.subHint.textContent = '当前浏览器不支持 EyeDropper API。请使用 Chrome 95+ 或 Edge 95+ 打开本插件。';
    setTip('不支持 EyeDropper API，无法取色', 'err');
  }

  bindEvents();
}

init();
