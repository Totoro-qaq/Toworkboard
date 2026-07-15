/* global gsap -- Loaded by demo/index.html from the installed GSAP browser bundle. */

const scenes = [...document.querySelectorAll('.scene')];
const chapters = [...document.querySelectorAll('.chapter')];
const captionIndex = document.querySelector('.caption-index');
const captionTitle = document.querySelector('.tour-caption strong');
const captionSubtitle = document.querySelector('.tour-caption small');
const captionProgress = document.querySelector('.caption-progress i');
const query = '容灾与高可用';

const copy = {
  overview: ['01 / 04', 'Meet the local-first dashboard.', '认识你的本地优先工作台。'],
  search: ['02 / 04', 'Search titles and the words inside every note.', '同时搜索标题与笔记正文。'],
  integrations: ['03 / 04', 'Review optional mail, GitHub and news signals.', '查看可选的邮箱、GitHub 与新闻信号。'],
  install: ['04 / 04', 'Build, copy three files, then enable the plugin.', '构建、复制三个文件，然后启用插件。'],
};

function setScene(name) {
  scenes.forEach((scene) => {
    const isCurrent = scene.dataset.scene === name;
    scene.setAttribute('aria-hidden', String(!isCurrent));
  });
  chapters.forEach((chapter) => chapter.classList.toggle('is-active', chapter.dataset.chapter === name));
  const [index, title, subtitle] = copy[name];
  captionIndex.textContent = index;
  captionTitle.textContent = title;
  captionSubtitle.textContent = subtitle;
}

function typeQuery() {
  const target = document.querySelector('.typed-query');
  target.textContent = query.slice(0, Math.max(0, Math.ceil(query.length * this.progress())));
}

function setStep(step) {
  document.querySelectorAll('.install-steps li').forEach((item, index) => {
    item.classList.toggle('is-current', index === step);
  });
}

const timeline = gsap.timeline({
  repeat: -1,
  defaults: { duration: 0.38, ease: 'power4.out' },
});

timeline
  .addLabel('overview', 0)
  .call(() => setScene('overview'), null, 'overview')
  .set('.scene-overview', { autoAlpha: 1, y: 0 })
  .from('.scene-overview .scene-copy > *', { autoAlpha: 0, y: 10, stagger: 0.08 }, 'overview')
  .from('.overview-shell', { autoAlpha: 0, y: 12, duration: 0.52 }, 'overview+=0.18')
  .from('.feature-index p', { autoAlpha: 0, x: 8, stagger: 0.07 }, 'overview+=0.38')
  .fromTo(captionProgress, { scaleX: 0 }, { scaleX: 1, duration: 2.65, ease: 'none' }, 'overview')
  .to('.scene-overview', { autoAlpha: 0, y: -8, duration: 0.24 }, 'overview+=2.5')

  .addLabel('search', 2.72)
  .call(() => setScene('search'), null, 'search')
  .set('.scene-search', { autoAlpha: 1, y: 0 }, 'search')
  .from('.scene-search .scene-topline', { autoAlpha: 0, y: 8 }, 'search')
  .from('.search-live', { autoAlpha: 0, y: 8 }, 'search+=0.12')
  .fromTo('.typed-query', { autoAlpha: 1 }, { duration: 0.82, ease: 'none', onUpdate: typeQuery }, 'search+=0.35')
  .from('.search-result', { autoAlpha: 0, y: 9, stagger: 0.1, duration: 0.34 }, 'search+=0.9')
  .fromTo(captionProgress, { scaleX: 0 }, { scaleX: 1, duration: 3.05, ease: 'none' }, 'search')
  .to('.scene-search', { autoAlpha: 0, y: -8, duration: 0.24 }, 'search+=2.9')

  .addLabel('integrations', 5.86)
  .call(() => setScene('integrations'), null, 'integrations')
  .set('.scene-integrations', { autoAlpha: 1, y: 0 }, 'integrations')
  .from('.scene-integrations .scene-topline', { autoAlpha: 0, y: 8 }, 'integrations')
  .from('.integration-panel', { autoAlpha: 0, y: 8, stagger: 0.08 }, 'integrations+=0.12')
  .to('.loader-rail i', { autoAlpha: 0.32, y: -4, scale: 0.82, stagger: 0.06, duration: 0.42, ease: 'sine.inOut' }, 'integrations+=0.42')
  .to('.loader-rail i', { autoAlpha: 1, y: 0, scale: 1, stagger: 0.06, duration: 0.34, ease: 'sine.inOut' }, 'integrations+=0.82')
  .to('.signal-loader', { autoAlpha: 0, duration: 0.2 }, 'integrations+=1.16')
  .set('.loaded-list', { visibility: 'visible' }, 'integrations+=1.24')
  .fromTo('.loaded-list', { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.28 }, 'integrations+=1.24')
  .from('.loaded-list p', { autoAlpha: 0, x: 8, stagger: 0.06 }, 'integrations+=1.3')
  .set('.source-state', { textContent: 'UPDATED' }, 'integrations+=1.3')
  .fromTo(captionProgress, { scaleX: 0 }, { scaleX: 1, duration: 3.2, ease: 'none' }, 'integrations')
  .to('.scene-integrations', { autoAlpha: 0, y: -8, duration: 0.24 }, 'integrations+=3.04')

  .addLabel('install', 9.0)
  .call(() => setScene('install'), null, 'install')
  .call(() => setStep(0), null, 'install')
  .set('.scene-install', { autoAlpha: 1, y: 0 }, 'install')
  .from('.scene-install .scene-topline', { autoAlpha: 0, y: 8 }, 'install')
  .from('.terminal', { autoAlpha: 0, y: 8 }, 'install+=0.12')
  .from('.terminal-line', { autoAlpha: 0, x: 7, stagger: 0.28, duration: 0.28 }, 'install+=0.4')
  .call(() => setStep(1), null, 'install+=1.25')
  .from('.install-steps li', { autoAlpha: 0, x: 8, stagger: 0.1 }, 'install+=0.35')
  .from('.terminal-success', { autoAlpha: 0, x: 7 }, 'install+=1.35')
  .call(() => setStep(2), null, 'install+=1.9')
  .from('.install-destination', { autoAlpha: 0, y: 7 }, 'install+=1.78')
  .fromTo(captionProgress, { scaleX: 0 }, { scaleX: 1, duration: 3.55, ease: 'none' }, 'install')
  .to('.scene-install', { autoAlpha: 0, y: -8, duration: 0.24 }, 'install+=3.45')
  .call(() => setScene('overview'), null, 'install+=3.7');

window.demoTimeline = timeline;
window.demoReady = true;

const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
if (reduceMotion) {
  timeline.pause('overview');
  setScene('overview');
}
