import type {
  BikeDTO,
  BikesListDTO,
  CreateBikeCommand,
  UpdateBikeCommand,
  GetBikesParams,
} from "../../types";

const API_BASE_URL = import.meta.env.PUBLIC_API_BASE_URL || "/api";

/**
 * Fetch all bikes for authenticated user
 */
export async function fetchBikes(
  params?: GetBikesParams,
): Promise<BikesListDTO> {
  const queryParams = new URLSearchParams();

  if (params?.status) {
    queryParams.append("status", params.status);
  }
  if (params?.type) {
    queryParams.append("type", params.type);
  }

  const url = `${API_BASE_URL}/bikes${
    queryParams.toString() ? `?${queryParams.toString()}` : ""
  }`;

  const response = await fetch(url, {
    method: "GET",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to fetch bikes");
  }

  return response.json();
}

/**
 * Create new bike
 */
export async function createBike(data: CreateBikeCommand): Promise<BikeDTO> {
  const response = await fetch(`${API_BASE_URL}/bikes`, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 422) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Validation error");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to create bike");
  }

  return response.json();
}

/**
 * Update existing bike
 */
export async function updateBike(
  bikeId: string,
  data: UpdateBikeCommand,
): Promise<BikeDTO> {
  const response = await fetch(`${API_BASE_URL}/bikes/${bikeId}`, {
    method: "PUT",
    credentials: "include",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify(data),
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Bike not found");
    }
    if (response.status === 422) {
      const errorData = await response.json();
      throw new Error(errorData.error?.message || "Validation error");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to update bike");
  }

  return response.json();
}

/**
 * Delete bike
 */
export async function deleteBike(bikeId: string): Promise<void> {
  const response = await fetch(`${API_BASE_URL}/bikes/${bikeId}`, {
    method: "DELETE",
    credentials: "include",
  });

  if (!response.ok) {
    if (response.status === 401) {
      throw new Error("Unauthorized");
    }
    if (response.status === 404) {
      throw new Error("Bike not found");
    }
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.message || "Failed to delete bike");
  }
}
