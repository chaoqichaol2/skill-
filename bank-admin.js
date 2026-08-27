const toast = document.querySelector("#toast");
const sidebar = document.querySelector(".sidebar");
const navItems = document.querySelectorAll(".nav-item");
const rangeButtons = document.querySelectorAll("[data-range]");

function showToast(message) {
  toast.textContent = message;
  toast.classList.add("is-visible");
  window.clearTimeout(showToast.timer);
  showToast.timer = window.setTimeout(() => toast.classList.remove("is-visible"), 2200);
}

navItems.forEach((item) => {
  item.addEventListener("click", () => {
    navItems.forEach((button) => button.classList.remove("is-active"));
    item.classList.add("is-active");
    document.querySelector("#pageTitle").textContent = item.dataset.page;
    sidebar.classList.remove("is-open");
    showToast(`${item.dataset.page}模块已切换`);
  });
});

rangeButtons.forEach((button) => {
  button.addEventListener("click", () => {
    rangeButtons.forEach((item) => item.classList.remove("is-active"));
    button.classList.add("is-active");
    showToast(`已切换至近 ${button.dataset.range} 日数据`);
  });
});

document.querySelector(".menu-button").addEventListener("click", () => sidebar.classList.toggle("is-open"));
document.querySelector("#exportButton").addEventListener("click", () => showToast("经营日报已加入导出队列"));
document.querySelector("#newTaskButton").addEventListener("click", () => showToast("新建任务面板准备中"));
document.querySelector(".risk-button").addEventListener("click", () => showToast("正在进入风险中心"));
document.querySelector(".service-card button").addEventListener("click", () => showToast("运营支持：400-888-6600"));
document.querySelectorAll(".todo-list button").forEach((button) => button.addEventListener("click", () => showToast(`${button.querySelector("strong").textContent}已打开`)));
