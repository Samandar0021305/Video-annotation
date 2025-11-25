import { createRouter, createWebHistory } from "vue-router";
import FramePlayer from "../components/FramePlayer/index.vue";
import VideoFrameExtractor from "../components/VideoFrameExtractor/index.vue";

const routes = [
  {
    path: "/",
    name: "Home",
    component: VideoFrameExtractor,
  },
  {
    path: "/video",
    name: "Video",
    component: FramePlayer,
  },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
});

export default router;
