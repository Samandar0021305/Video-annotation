import { loadOpenCV, isOpenCVReady } from './opencv-loader';

let opencvFailed = false;
let loadingPromise: Promise<void> | null = null;

export { isOpenCVReady };

export const waitForOpenCV = async (maxAttempts = 2, retryDelay = 3000): Promise<void> => {
  if (opencvFailed) {
    throw new Error('OpenCV initialization permanently failed');
  }

  if (!loadingPromise) {
    loadingPromise = loadOpenCV();
  }

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      await waitForOpenCVSingle();
      return;
    } catch (error: any) {
      console.warn(
        `OpenCV initialization attempt ${attempt}/${maxAttempts} failed:`,
        error.message
      );

      if (attempt < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, retryDelay));
      } else {
        opencvFailed = true;
        throw new Error('OpenCV initialization failed after 2 attempts');
      }
    }
  }
};

const waitForOpenCVSingle = (): Promise<void> => {
  return new Promise((resolve, reject) => {
    if (isOpenCVReady()) {
      resolve();
      return;
    }

    if (window.opencvError) {
      reject(new Error(`OpenCV already failed: ${window.opencvError}`));
      return;
    }

    const timeout = setTimeout(() => {
      window.removeEventListener('opencvReady', onReady);
      window.removeEventListener('opencvError', onError);
      reject(new Error('OpenCV initialization timeout'));
    }, 10000);

    const onReady = () => {
      clearTimeout(timeout);
      window.removeEventListener('opencvReady', onReady);
      window.removeEventListener('opencvError', onError);
      if (isOpenCVReady()) {
        resolve();
      } else {
        setTimeout(() => {
          if (isOpenCVReady()) {
            resolve();
          } else {
            reject(
              new Error('OpenCV marked as ready but functions not available')
            );
          }
        }, 100);
      }
    };

    const onError = (event: any) => {
      clearTimeout(timeout);
      window.removeEventListener('opencvReady', onReady);
      window.removeEventListener('opencvError', onError);
      reject(new Error(`OpenCV initialization failed: ${event.detail}`));
    };

    window.addEventListener('opencvReady', onReady);
    window.addEventListener('opencvError', onError as EventListener);
  });
};
