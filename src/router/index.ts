import { createRouter, createWebHistory } from "vue-router";
import FramePlayer from "../components/FramePlayer/index.vue";

const routes = [
  {
    path: "/",
    name: "Video",
    component: FramePlayer,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
