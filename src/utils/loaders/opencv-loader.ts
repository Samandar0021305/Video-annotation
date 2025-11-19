declare global {
  interface Window {
    cv: any;
    opencvReady: boolean;
    opencvError: string | null;
    initializeOpenCV?: () => Promise<void>;
  }
}

let loadPromise: Promise<void> | null = null;

export const loadOpenCV = (): Promise<void> => {
  if (loadPromise) {
    return loadPromise;
  }

  if (window.opencvReady === true) {
    loadPromise = Promise.resolve();
    return loadPromise;
  }

  loadPromise = new Promise<void>((resolve, reject) => {
    const script = document.createElement('script');
    // Use more reliable jsdelivr CDN instead of docs.opencv.org
    script.src = 'https://cdn.jsdelivr.net/npm/@techstark/opencv-js@4.9.0-release.1/dist/opencv.min.js';
    script.async = true;
    script.crossOrigin = 'anonymous';

    const timeout = setTimeout(() => {
      window.opencvError = 'OpenCV loading timeout';
      reject(new Error('OpenCV loading timeout'));
    }, 30000);

    script.onload = () => {
      const checkReady = setInterval(() => {
        if (window.cv && window.cv.imread && window.cv.Mat) {
          clearInterval(checkReady);
          clearTimeout(timeout);
          window.opencvReady = true;
          window.dispatchEvent(new Event('opencvReady'));
          resolve();
        }
      }, 100);
    };

    script.onerror = () => {
      clearTimeout(timeout);
      window.opencvError = 'Failed to load OpenCV script';
      window.dispatchEvent(new CustomEvent('opencvError', {
        detail: 'Failed to load OpenCV script'
      }));
      reject(new Error('Failed to load OpenCV script'));
    };

    document.head.appendChild(script);
  }).catch((error: Error) => {
    loadPromise = null;
    throw error;
  }) as Promise<void>;

  return loadPromise;
};

export const isOpenCVReady = (): boolean => {
  return (
    window.opencvReady === true &&
    window.cv &&
    typeof window.cv.imread === 'function' &&
    typeof window.cv.Mat === 'function'  // CRITICAL: Check WASM runtime
  );
};

export const getOpenCVError = (): string | null => {
  return window.opencvError || null;
};
