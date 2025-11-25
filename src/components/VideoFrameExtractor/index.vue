<template>
  <div class="video-frame-extractor">
    <div class="header-actions">
      <button
        class="start-annotation-btn"
        :disabled="!hasFrames"
        @click="startAnnotation"
      >
        Start Annotation
      </button>
    </div>

    <div v-if="isLoadingCache" class="loading-section">
      <div class="loading-spinner"></div>
      <p>Loading cached frames...</p>
    </div>

    <div v-else class="upload-section">
      <div
        class="upload-area"
        :class="{ 'drag-over': isDragOver }"
        @drop.prevent="handleDrop"
        @dragover.prevent="isDragOver = true"
        @dragleave.prevent="isDragOver = false"
      >
        <input
          type="file"
          ref="fileInputRef"
          accept="video/*"
          @change="handleFileSelect"
          style="display: none"
        />

        <div
          v-if="!selectedFile"
          class="upload-placeholder"
          @click="triggerFileInput"
        >
          <svg
            xmlns="http://www.w3.org/2000/svg"
            width="64"
            height="64"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            stroke-width="2"
            stroke-linecap="round"
            stroke-linejoin="round"
          >
            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
            <polyline points="17 8 12 3 7 8"></polyline>
            <line x1="12" y1="3" x2="12" y2="15"></line>
          </svg>
          <p>Upload video</p>
        </div>

        <div v-else class="video-preview">
          <video ref="videoRef" :src="videoUrl" controls></video>
          <button class="change-video-btn" @click="resetVideo">
            Change Video
          </button>
        </div>
      </div>

      <div
        v-if="videoMetadata && !isExtracting && frames.length === 0"
        class="extraction-controls"
      >
        <div class="control-group">
          <label>FPS: {{ selectedFPS }}</label>
          <input
            type="range"
            min="1"
            max="60"
            v-model.number="selectedFPS"
            class="fps-slider"
          />
          <div class="fps-info">
            <span>Duration: {{ formatDuration(videoMetadata.duration) }}</span>
            <span>Estimated frames: {{ estimatedFrames }}</span>
          </div>
        </div>

        <button class="extract-btn" @click="startExtraction">
          Extract Frames
        </button>
      </div>

      <div v-if="isExtracting" class="progress-section">
        <div class="progress-bar-container">
          <div
            class="progress-bar"
            :style="{ width: `${extractionProgress.percentage}%` }"
          ></div>
        </div>
        <p class="progress-text">
          Extracting frames: {{ extractionProgress.current }} /
          {{ extractionProgress.total }} ({{
            Math.round(extractionProgress.percentage)
          }}%)
        </p>
      </div>

      <div v-if="isSavingCache" class="progress-section">
        <div class="progress-bar-container">
          <div class="progress-bar saving" style="width: 100%"></div>
        </div>
        <p class="progress-text">Saving to cache...</p>
      </div>

      <div v-if="error" class="error-message">
        {{ error }}
      </div>
    </div>

    <div v-if="frames.length > 0" class="frames-section">
      <div class="frames-header">
        <h2>Extracted Frames ({{ frames.length }})</h2>
        <button class="clear-btn" @click="clearFrames">Clear All</button>
      </div>

      <div class="frames-grid">
        <FrameCard v-for="frame in frames" :key="frame.id" :frame="frame" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from "vue";
import { useRouter } from "vue-router";
import FrameCard from "./FrameCard.vue";
import { extractFrames, getVideoMetadata, cleanup } from "../../utils/ffmpeg";
import { useFramesStore } from "../../stores/framesStore";
import type {
  ExtractedFrame,
  VideoMetadata,
  ExtractionProgress,
} from "../../types/video";

const router = useRouter();
const framesStore = useFramesStore();

const fileInputRef = ref<HTMLInputElement | null>(null);
const videoRef = ref<HTMLVideoElement | null>(null);
const selectedFile = ref<File | null>(null);
const videoUrl = ref<string>("");
const videoMetadata = ref<VideoMetadata | null>(null);
const selectedFPS = ref<number>(30);
const frames = ref<ExtractedFrame[]>([]);
const isExtracting = ref(false);
const isDragOver = ref(false);
const error = ref<string>("");
const isLoadingCache = ref(false);
const isSavingCache = ref(false);

const extractionProgress = ref<ExtractionProgress>({
  current: 0,
  total: 0,
  percentage: 0,
});

const estimatedFrames = computed(() => {
  if (!videoMetadata.value) return 0;
  return Math.ceil(videoMetadata.value.duration * selectedFPS.value);
});

const hasFrames = computed(() => frames.value.length > 0);

const triggerFileInput = () => {
  fileInputRef.value?.click();
};

const handleFileSelect = async (event: Event) => {
  const target = event.target as HTMLInputElement;
  if (target.files && target.files[0]) {
    await processFile(target.files[0]);
  }
};

const handleDrop = async (event: DragEvent) => {
  isDragOver.value = false;
  if (event.dataTransfer?.files && event.dataTransfer.files[0]) {
    await processFile(event.dataTransfer.files[0]);
  }
};

const processFile = async (file: File) => {
  error.value = "";
  selectedFile.value = file;

  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }

  videoUrl.value = URL.createObjectURL(file);

  try {
    videoMetadata.value = await getVideoMetadata(file);
  } catch (err) {
    error.value = "Failed to load video metadata";
    console.error(err);
  }
};

const startExtraction = async () => {
  if (!selectedFile.value) return;

  error.value = "";
  isExtracting.value = true;
  frames.value = [];

  try {
    const extractedFrames = await extractFrames(
      selectedFile.value,
      selectedFPS.value,
      (current, total) => {
        extractionProgress.value = {
          current,
          total,
          percentage: (current / total) * 100,
        };
      }
    );

    frames.value = extractedFrames;

    framesStore.setFrames(extractedFrames, selectedFPS.value, {
      duration: videoMetadata.value?.duration || 0,
      width: videoMetadata.value?.width || 0,
      height: videoMetadata.value?.height || 0,
    }, selectedFile.value?.name || '');

    isSavingCache.value = true;
    await framesStore.saveToCache();
    isSavingCache.value = false;
  } catch (err: any) {
    error.value = `Failed to extract frames: ${err.message || "Unknown error"}`;
    console.error("Extraction error:", err);
  } finally {
    isExtracting.value = false;
    isSavingCache.value = false;
  }
};

const startAnnotation = () => {
  if (hasFrames.value) {
    router.push("/video");
  }
};

const resetVideo = () => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }
  selectedFile.value = null;
  videoUrl.value = "";
  videoMetadata.value = null;
  clearFrames();
};

const clearFrames = () => {
  frames.value.forEach((frame) => {
    URL.revokeObjectURL(frame.imageUrl);
  });
  frames.value = [];
  framesStore.clearFrames();
  extractionProgress.value = { current: 0, total: 0, percentage: 0 };
};

const loadFromCache = async () => {
  isLoadingCache.value = true;

  try {
    const hasCached = await framesStore.checkCache();

    if (hasCached) {
      const loaded = await framesStore.loadFromCache();

      if (loaded) {
        frames.value = framesStore.allFrames;
        await framesStore.updateCacheInfo();
      }
    }
  } catch (err) {
    console.error("Failed to load from cache:", err);
  } finally {
    isLoadingCache.value = false;
  }
};

const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, "0")}`;
};

onMounted(async () => {
  await framesStore.updateCacheInfo();
  await loadFromCache();
});

onUnmounted(() => {
  if (videoUrl.value) {
    URL.revokeObjectURL(videoUrl.value);
  }
  cleanup();
});
</script>

<style scoped>
.video-frame-extractor {
  max-width: 1400px;
  margin: 0 auto;
  padding: 20px;
}

.header-actions {
  display: flex;
  justify-content: flex-end;
  margin-bottom: 20px;
}

.start-annotation-btn {
  padding: 12px 24px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: all 0.3s;
  box-shadow: 0 4px 15px rgba(102, 126, 234, 0.4);
}

.start-annotation-btn:hover:not(:disabled) {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(102, 126, 234, 0.6);
}

.start-annotation-btn:disabled {
  background: #e0e0e0;
  color: #a0a0a0;
  cursor: not-allowed;
  box-shadow: none;
}

.loading-section {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 60px 20px;
  background: white;
  border-radius: 12px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
}

.loading-spinner {
  width: 48px;
  height: 48px;
  border: 4px solid #e5e7eb;
  border-top-color: #3b82f6;
  border-radius: 50%;
  animation: spin 1s linear infinite;
  margin-bottom: 16px;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.loading-section p {
  color: #6b7280;
  font-size: 16px;
  font-weight: 500;
}

.upload-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  margin-bottom: 40px;
}

.upload-area {
  border: 2px dashed #d1d5db;
  border-radius: 12px;
  padding: 40px;
  transition: all 0.3s;
  background: #fafafa;
}

.upload-area.drag-over {
  border-color: #3b82f6;
  background: #eff6ff;
}

.upload-placeholder {
  text-align: center;
  cursor: pointer;
}

.upload-placeholder svg {
  color: #9ca3af;
  margin-bottom: 16px;
}

.upload-placeholder p {
  font-size: 18px;
  font-weight: 600;
  color: #374151;
  margin-bottom: 8px;
}

.upload-placeholder span {
  font-size: 14px;
  color: #6b7280;
}

.video-preview {
  position: relative;
}

.video-preview video {
  width: 100%;
  max-height: 500px;
  border-radius: 8px;
  background: #000;
}

.change-video-btn {
  margin-top: 16px;
  padding: 8px 16px;
  background: #6b7280;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  transition: background 0.2s;
}

.change-video-btn:hover {
  background: #4b5563;
}

.extraction-controls {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #e5e7eb;
}

.control-group {
  margin-bottom: 24px;
}

.control-group label {
  display: block;
  font-size: 18px;
  font-weight: 600;
  color: #1f2937;
  margin-bottom: 12px;
}

.fps-slider {
  width: 100%;
  height: 8px;
  border-radius: 4px;
  background: #e5e7eb;
  outline: none;
  cursor: pointer;
}

.fps-slider::-webkit-slider-thumb {
  appearance: none;
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  transition: transform 0.2s;
}

.fps-slider::-webkit-slider-thumb:hover {
  transform: scale(1.2);
}

.fps-slider::-moz-range-thumb {
  width: 24px;
  height: 24px;
  border-radius: 50%;
  background: #3b82f6;
  cursor: pointer;
  border: none;
}

.fps-info {
  display: flex;
  justify-content: space-between;
  margin-top: 12px;
  font-size: 14px;
  color: #6b7280;
}

.extract-btn {
  width: 100%;
  padding: 16px;
  background: #3b82f6;
  color: white;
  border: none;
  border-radius: 8px;
  font-size: 16px;
  font-weight: 600;
  cursor: pointer;
  transition: background 0.2s;
}

.extract-btn:hover:not(:disabled) {
  background: #2563eb;
}

.extract-btn:disabled {
  background: #9ca3af;
  cursor: not-allowed;
}

.progress-section {
  margin-top: 32px;
  padding-top: 32px;
  border-top: 1px solid #e5e7eb;
}

.progress-bar-container {
  width: 100%;
  height: 12px;
  background: #e5e7eb;
  border-radius: 6px;
  overflow: hidden;
  margin-bottom: 12px;
}

.progress-bar {
  height: 100%;
  background: linear-gradient(90deg, #3b82f6, #2563eb);
  transition: width 0.3s ease;
  border-radius: 6px;
}

.progress-bar.saving {
  background: linear-gradient(90deg, #10b981, #059669);
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% {
    opacity: 1;
  }
  50% {
    opacity: 0.7;
  }
}

.progress-text {
  text-align: center;
  font-size: 14px;
  color: #6b7280;
  font-weight: 500;
}

.error-message {
  margin-top: 16px;
  padding: 12px 16px;
  background: #fee2e2;
  color: #991b1b;
  border-radius: 6px;
  font-size: 14px;
}

.frames-section {
  background: white;
  border-radius: 12px;
  padding: 32px;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.frames-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24px;
  padding-bottom: 16px;
  border-bottom: 2px solid #e5e7eb;
}

.frames-header h2 {
  font-size: 24px;
  font-weight: 700;
  color: #1f2937;
}

.clear-btn {
  padding: 8px 16px;
  background: #ef4444;
  color: white;
  border: none;
  border-radius: 6px;
  cursor: pointer;
  font-size: 14px;
  font-weight: 500;
  transition: background 0.2s;
}

.clear-btn:hover {
  background: #dc2626;
}

.frames-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 20px;
}
</style>
