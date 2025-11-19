import { ref, onMounted, onUnmounted } from "vue";
import Konva from "konva";

export function useVideoPlayer() {
  const videoElement = ref<HTMLVideoElement>(document.createElement("video"));
  const videoLoaded = ref(false);
  const videoFileName = ref("");
  const isPlaying = ref(false);
  const animation = ref<Konva.Animation | null>(null);

  const videoSize = ref({ width: 0, height: 0 });
  const currentFrame = ref(0);
  const videoFPS = ref(30);
  const currentTime = ref(0);
  const videoDuration = ref(0);

  const videoLayerRef = ref<any>(null);

  const updateCurrentFrame = () => {
    currentTime.value = videoElement.value.currentTime;
    currentFrame.value = Math.floor(
      videoElement.value.currentTime * videoFPS.value
    );
  };

  const handleVideoLoaded = () => {
    videoLoaded.value = true;
    videoDuration.value = videoElement.value.duration;

    const videoWidth = videoElement.value.videoWidth;
    const videoHeight = videoElement.value.videoHeight;

    videoSize.value = {
      width: videoWidth,
      height: videoHeight,
    };
  };

  const handlePlay = () => {
    isPlaying.value = true;
    videoElement.value.play();

    if (videoLayerRef.value) {
      const anim = new Konva.Animation(() => {
        updateCurrentFrame();
      }, videoLayerRef.value.getNode());
      animation.value = anim;
      anim.start();
    }
  };

  const handlePause = () => {
    isPlaying.value = false;
    videoElement.value.pause();

    if (animation.value) {
      animation.value.stop();
    }
    updateCurrentFrame();
  };

  const togglePlayPause = () => {
    if (isPlaying.value) {
      handlePause();
    } else {
      handlePlay();
    }
  };

  const resetVideo = () => {
    videoElement.value.currentTime = 0;
    handlePause();
  };

  const seekToTime = (time: number) => {
    videoElement.value.currentTime = time;
    updateCurrentFrame();
  };

  const nextFrame = () => {
    const frameDuration = 1 / videoFPS.value;
    videoElement.value.currentTime = Math.min(
      videoElement.value.currentTime + frameDuration,
      videoDuration.value
    );
    updateCurrentFrame();
  };

  const previousFrame = () => {
    const frameDuration = 1 / videoFPS.value;
    videoElement.value.currentTime = Math.max(
      videoElement.value.currentTime - frameDuration,
      0
    );
    updateCurrentFrame();
  };

  const handleVideoUpload = (file: File) => {
    videoFileName.value = file.name;
    const url = URL.createObjectURL(file);
    videoElement.value.src = url;
    videoElement.value.load();
  };

  const loadVideoFromUrl = (url: string, fileName: string = "video.mp4") => {
    // Reset state for new video
    videoLoaded.value = false;
    isPlaying.value = false;
    currentFrame.value = 0;
    currentTime.value = 0;

    // Stop any running animation
    if (animation.value) {
      animation.value.stop();
      animation.value = null;
    }

    videoFileName.value = fileName;

    // Set CORS for URL videos (required for canvas operations)
    if (url.startsWith('http://') || url.startsWith('https://')) {
      videoElement.value.crossOrigin = "anonymous";
    } else {
      videoElement.value.crossOrigin = "";
    }

    videoElement.value.src = url;
    videoElement.value.load();
  };

  onMounted(() => {
    videoElement.value.addEventListener("loadedmetadata", handleVideoLoaded);
    videoElement.value.addEventListener("timeupdate", updateCurrentFrame);
  });

  onUnmounted(() => {
    videoElement.value.removeEventListener("loadedmetadata", handleVideoLoaded);
    videoElement.value.removeEventListener("timeupdate", updateCurrentFrame);
    if (animation.value) {
      animation.value.stop();
    }
    if (videoElement.value.src) {
      URL.revokeObjectURL(videoElement.value.src);
    }
  });

  return {
    videoElement,
    videoLoaded,
    videoFileName,
    isPlaying,
    videoSize,
    currentFrame,
    videoFPS,
    currentTime,
    videoDuration,
    videoLayerRef,
    handleVideoUpload,
    loadVideoFromUrl,
    togglePlayPause,
    resetVideo,
    seekToTime,
    nextFrame,
    previousFrame,
  };
}
