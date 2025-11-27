import axios from "axios";
import { showErrorToast } from "../utils/toast";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface AnnotationClass {
  id: string;
  name: string;
  color: string;
  markupType: "bbox" | "mask" | "polygon" | "skeleton";
  value: number;
}

export interface AnnotationData {
  bbox: any[];
  polygon: any[];
  skeleton: any[];
  brush: any[];
}

export interface AnnotationDataWithClasses extends AnnotationData {
  classes?: AnnotationClass[];
}

export interface ApiResponse {
  result: AnnotationDataWithClasses;
  id: string;
  classes?: AnnotationClass[];
}

function getConfigWithAuth() {
  const token = import.meta.env.VITE_API_BASE_TOKEN;
  if (token) {
    return {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    };
  }
  return {};
}
export async function loadAnnotations(
  videoFilename: string
): Promise<AnnotationDataWithClasses> {
  try {
    const config = getConfigWithAuth();
    const response = await axios.get<ApiResponse>(
      `${API_BASE_URL}/${videoFilename}/`,
      config
    );

    const result = response.data.result || {
      bbox: [],
      polygon: [],
      skeleton: [],
      brush: [],
    };

    return {
      bbox: result.bbox || [],
      polygon: result.polygon || [],
      skeleton: result.skeleton || [],
      brush: result.brush || [],
      classes: result.classes || [],
    };
  } catch (error: any) {
    if (error.response?.status === 404) {
      return {
        bbox: [],
        polygon: [],
        skeleton: [],
        brush: [],
        classes: [],
      };
    }
    const errorMessage = `Failed to load annotations: ${error.message}`;
    showErrorToast(errorMessage, 3000);
    throw new Error(errorMessage);
  }
}

export async function saveAnnotations(
  videoFilename: string,
  annotations: AnnotationData,
  classes: AnnotationClass[] = []
): Promise<void> {
  try {
    const config = getConfigWithAuth();

    await axios.put(
      `${API_BASE_URL}/${videoFilename}/`,
      {
        result: { ...annotations, classes },
        id: videoFilename,
      },
      config
    );
  } catch (error: any) {
    const errorMessage = `Failed to save annotations: ${error.message}`;
    showErrorToast(errorMessage, 3000);
    throw new Error(errorMessage);
  }
}

// Helper to convert Map-based tracks to array format for API
export function tracksMapToArray(tracksMap: Map<string, any>): any[] {
  return Array.from(tracksMap.values()).map((track) => ({
    ...track,
    keyframes: Object.fromEntries(track.keyframes),
  }));
}

// Helper to convert array format from API to Map-based tracks
export function tracksArrayToMap(tracksArray: any[]): Map<string, any> {
  const map = new Map();
  for (const track of tracksArray) {
    const keyframesMap = new Map(
      Object.entries(track.keyframes || {}).map(([key, value]) => [
        parseInt(key),
        value,
      ])
    );
    map.set(track.trackId, {
      ...track,
      keyframes: keyframesMap,
    });
  }
  return map;
}
