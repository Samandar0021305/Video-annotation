import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export interface AnnotationData {
  bbox: any[];
  polygon: any[];
  skeleton: any[];
  brush: any[];
}

export interface ApiResponse {
  result: AnnotationData;
}

export async function loadAnnotations(
  videoFilename: string
): Promise<AnnotationData> {
  try {
    const response = await axios.get<ApiResponse>(
      `${API_BASE_URL}/results/${videoFilename}/`
    );

    return (
      response.data.result || {
        bbox: [],
        polygon: [],
        skeleton: [],
        brush: [],
      }
    );
  } catch (error: any) {
    if (error.response?.status === 404) {
      // Return empty data if no annotations exist yet
      return {
        bbox: [],
        polygon: [],
        skeleton: [],
        brush: [],
      };
    }
    throw new Error(`Failed to load annotations: ${error.message}`);
  }
}

export async function saveAnnotations(
  videoFilename: string,
  annotations: AnnotationData
): Promise<void> {
  try {
    await axios.put(`${API_BASE_URL}/results/${videoFilename}/`, {
      result: annotations,
    });
  } catch (error: any) {
    throw new Error(`Failed to save annotations: ${error.message}`);
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
