import type { ExtractedFrame, VideoMetadata } from '../types/video';

export async function loadFFmpeg(): Promise<void> {
  return Promise.resolve();
}

export async function getVideoMetadata(file: File): Promise<VideoMetadata> {
  return new Promise((resolve, reject) => {
    const video = document.createElement('video');
    video.preload = 'metadata';

    video.onloadedmetadata = () => {
      resolve({
        duration: video.duration,
        width: video.videoWidth,
        height: video.videoHeight,
        fps: 30,
      });
      URL.revokeObjectURL(video.src);
    };

    video.onerror = () => {
      reject(new Error('Failed to load video metadata'));
      URL.revokeObjectURL(video.src);
    };

    video.src = URL.createObjectURL(file);
  });
}

function seekVideo(video: HTMLVideoElement, time: number): Promise<void> {
  return new Promise((resolve, reject) => {
    const onSeeked = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      resolve();
    };

    const onError = () => {
      video.removeEventListener('seeked', onSeeked);
      video.removeEventListener('error', onError);
      reject(new Error('Failed to seek video'));
    };

    video.addEventListener('seeked', onSeeked);
    video.addEventListener('error', onError);
    video.currentTime = time;
  });
}

function captureFrame(video: HTMLVideoElement, canvas: HTMLCanvasElement): string {
  const ctx = canvas.getContext('2d', { willReadFrequently: false });
  if (!ctx) {
    throw new Error('Failed to get canvas context');
  }

  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;

  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

  return canvas.toDataURL('image/jpeg', 0.92);
}

export async function extractFrames(
  file: File,
  fps: number,
  onProgress?: (current: number, total: number) => void
): Promise<ExtractedFrame[]> {
  const video = document.createElement('video');
  const canvas = document.createElement('canvas');

  video.preload = 'auto';
  video.muted = true;

  const videoUrl = URL.createObjectURL(file);
  video.src = videoUrl;

  try {
    await new Promise<void>((resolve, reject) => {
      video.onloadedmetadata = () => resolve();
      video.onerror = () => reject(new Error('Failed to load video'));
    });

    const duration = video.duration;
    const frameInterval = 1 / fps;
    const totalFrames = Math.floor(duration * fps);
    const frames: ExtractedFrame[] = [];

    for (let i = 0; i < totalFrames; i++) {
      const timestamp = i * frameInterval;

      if (timestamp >= duration) break;

      await seekVideo(video, timestamp);

      const imageUrl = captureFrame(video, canvas);

      frames.push({
        id: `frame_${i}`,
        imageUrl,
        frameNumber: i + 1,
        timestamp,
      });

      if (onProgress) {
        onProgress(i + 1, totalFrames);
      }
    }

    URL.revokeObjectURL(videoUrl);

    return frames;
  } catch (error) {
    URL.revokeObjectURL(videoUrl);
    throw error;
  }
}

export function cleanup(): void {
  return;
}
