import { describe, it, expect, vi, beforeEach } from "vitest";

// Mock Supabase client before imports
vi.mock("../../db/supabase.client", () => ({
  supabaseClient: {
    from: vi.fn(),
    rpc: vi.fn(),
  },
}));

import {
  getCommunityOutfits,
  getUserLocation,
  LocationNotFoundError,
  CommunityServiceError,
} from "../../services/community.service";
import type { GetCommunityOutfitsParams, Coordinates } from "../../types";
import { supabaseClient } from "../../db/supabase.client";

const mockSupabase = vi.mocked(supabaseClient);

describe("Community Service", () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe("getUserLocation", () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const locationId = "6ba7b810-9dad-11d1-80b4-00c04fd430c8";

    it("should return coordinates for valid location", async () => {
      const mockLocationData = {
        location: "POINT(21.0122 52.2297)", // Warsaw coordinates
      };

      const mockCoordsData = {
        latitude: 52.2297,
        longitude: 21.0122,
      };

      // Mock location query chain
      const mockSingle = vi.fn().mockResolvedValue({
        data: mockLocationData,
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      // Mock coordinates extraction
      mockSupabase.rpc.mockResolvedValue({
        data: mockCoordsData,
        error: null,
      });

      const result = await getUserLocation(userId, locationId);

      expect(result).toEqual({
        latitude: 52.2297,
        longitude: 21.0122,
      });

      expect(mockSupabase.from).toHaveBeenCalledWith("user_locations");
      expect(mockSupabase.rpc).toHaveBeenCalledWith("extract_coordinates", {
        location_point: mockLocationData.location,
      });
    });

    it("should throw LocationNotFoundError when location doesn't exist", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" }, // No rows returned
      });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      await expect(getUserLocation(userId, locationId)).rejects.toThrow(
        LocationNotFoundError,
      );
      await expect(getUserLocation(userId, locationId)).rejects.toThrow(
        `Location with id ${locationId} does not exist or does not belong to the user`,
      );
    });

    it("should throw LocationNotFoundError when location data is null", async () => {
      const mockSingle = vi.fn().mockResolvedValue({
        data: { location: null },
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      await expect(getUserLocation(userId, locationId)).rejects.toThrow(
        LocationNotFoundError,
      );
    });

    it("should throw CommunityServiceError for database errors", async () => {
      const dbError = new Error("Database connection failed");
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: dbError,
      });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      await expect(getUserLocation(userId, locationId)).rejects.toThrow(
        CommunityServiceError,
      );
      await expect(getUserLocation(userId, locationId)).rejects.toThrow(
        "Database error while fetching location",
      );
    });

    it("should throw CommunityServiceError for coordinate extraction errors", async () => {
      const mockLocationData = {
        location: "POINT(21.0122 52.2297)",
      };

      const mockSingle = vi.fn().mockResolvedValue({
        data: mockLocationData,
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      const coordsError = new Error("PostGIS error");
      mockSupabase.rpc.mockResolvedValue({
        data: null,
        error: coordsError,
      });

      await expect(getUserLocation(userId, locationId)).rejects.toThrow(
        CommunityServiceError,
      );
      await expect(getUserLocation(userId, locationId)).rejects.toThrow(
        "Error extracting coordinates",
      );
    });
  });

  describe("getCommunityOutfits", () => {
    const userId = "550e8400-e29b-41d4-a716-446655440000";
    const validParams: GetCommunityOutfitsParams = {
      location_id: "6ba7b810-9dad-11d1-80b4-00c04fd430c8",
      radius_km: 50,
      temperature: 15,
      temperature_range: 3,
      activity_type: "tempo",
      min_rating: 4,
      reputation_filter: "ekspert",
      time_range: 24,
      sort: "reputation",
      limit: 10,
      offset: 0,
    };

    const mockLocation: Coordinates = {
      latitude: 52.2297,
      longitude: 21.0122,
    };

    const mockOutfitData = [
      {
        id: "outfit-1",
        user_pseudonym: "kolarz_xyz789",
        reputation_badge: "ekspert",
        feedback_count: 67,
        distance_km: "15.2",
        weather_conditions: {
          temperature: 15,
          feels_like: 13,
          wind_speed: 8,
          humidity: 70,
          rain_mm: 0,
        },
        activity_type: "tempo",
        outfit: {
          head: "opaska",
          torso: { base: "koszulka_dl", mid: "nic", outer: "nic" },
          arms: "nic",
          hands: "rekawiczki_letnie",
          legs: "krotkie",
          feet: { socks: "letnie", covers: "nic" },
          neck: "nic",
        },
        overall_rating: 5,
        created_at: "2025-10-10T08:30:00Z",
      },
    ];

    beforeEach(() => {
      // Mock getUserLocation success
      const mockSingle = vi.fn().mockResolvedValue({
        data: { location: "POINT(21.0122 52.2297)" },
        error: null,
      });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === "extract_coordinates") {
          return Promise.resolve({
            data: mockLocation,
            error: null,
          });
        }
        return Promise.resolve({ data: null, error: null });
      });
    });

    it("should return community outfits successfully", async () => {
      // Mock main query
      mockSupabase.rpc.mockImplementation((functionName, _params) => {
        if (functionName === "extract_coordinates") {
          return Promise.resolve({ data: mockLocation, error: null });
        }
        if (functionName === "get_community_outfits") {
          return Promise.resolve({ data: mockOutfitData, error: null });
        }
        if (functionName === "get_community_outfits_count") {
          return Promise.resolve({ data: 1, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await getCommunityOutfits(userId, validParams);

      expect(result).toEqual({
        outfits: [
          {
            id: "outfit-1",
            user_pseudonym: "kolarz_xyz789",
            reputation_badge: "ekspert",
            feedback_count: 67,
            distance_km: 15.2,
            weather_conditions: {
              temperature: 15,
              feels_like: 13,
              wind_speed: 8,
              humidity: 70,
              rain_mm: 0,
            },
            activity_type: "tempo",
            outfit: {
              head: "opaska",
              torso: { base: "koszulka_dl", mid: "nic", outer: "nic" },
              arms: "nic",
              hands: "rekawiczki_letnie",
              legs: "krotkie",
              feet: { socks: "letnie", covers: "nic" },
              neck: "nic",
            },
            overall_rating: 5,
            created_at: "2025-10-10T08:30:00Z",
          },
        ],
        total: 1,
        has_more: false,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith("get_community_outfits", {
        center_lng: 21.0122,
        center_lat: 52.2297,
        radius_meters: 50000, // 50km * 1000
        time_range_hours: 24,
        temperature: 15,
        temperature_range: 3,
        activity_type: "tempo",
        min_rating: 4,
        reputation_filter: "ekspert",
        sort_by: "reputation",
        result_limit: 10,
        result_offset: 0,
      });

      expect(mockSupabase.rpc).toHaveBeenCalledWith(
        "get_community_outfits_count",
        {
          center_lng: 21.0122,
          center_lat: 52.2297,
          radius_meters: 50000,
          time_range_hours: 24,
          temperature: 15,
          temperature_range: 3,
          activity_type: "tempo",
          min_rating: 4,
          reputation_filter: "ekspert",
        },
      );
    });

    it("should handle empty results", async () => {
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === "extract_coordinates") {
          return Promise.resolve({ data: mockLocation, error: null });
        }
        if (functionName === "get_community_outfits") {
          return Promise.resolve({ data: [], error: null });
        }
        if (functionName === "get_community_outfits_count") {
          return Promise.resolve({ data: 0, error: null });
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await getCommunityOutfits(userId, validParams);

      expect(result).toEqual({
        outfits: [],
        total: 0,
        has_more: false,
      });
    });

    it("should calculate has_more correctly for pagination", async () => {
      const paginationParams = { ...validParams, limit: 10, offset: 0 };

      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === "extract_coordinates") {
          return Promise.resolve({ data: mockLocation, error: null });
        }
        if (functionName === "get_community_outfits") {
          return Promise.resolve({ data: mockOutfitData, error: null });
        }
        if (functionName === "get_community_outfits_count") {
          return Promise.resolve({ data: 25, error: null }); // Total > limit + offset
        }
        return Promise.resolve({ data: null, error: null });
      });

      const result = await getCommunityOutfits(userId, paginationParams);

      expect(result.has_more).toBe(true);
      expect(result.total).toBe(25);
    });

    it("should throw CommunityServiceError for main query failures", async () => {
      const queryError = new Error("Spatial query failed");
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === "extract_coordinates") {
          return Promise.resolve({ data: mockLocation, error: null });
        }
        if (functionName === "get_community_outfits") {
          return Promise.resolve({ data: null, error: queryError });
        }
        return Promise.resolve({ data: null, error: null });
      });

      await expect(getCommunityOutfits(userId, validParams)).rejects.toThrow(
        CommunityServiceError,
      );
      await expect(getCommunityOutfits(userId, validParams)).rejects.toThrow(
        "Spatial query failed",
      );
    });

    it("should throw CommunityServiceError for count query failures", async () => {
      const countError = new Error("Count query failed");
      mockSupabase.rpc.mockImplementation((functionName) => {
        if (functionName === "extract_coordinates") {
          return Promise.resolve({ data: mockLocation, error: null });
        }
        if (functionName === "get_community_outfits") {
          return Promise.resolve({ data: [], error: null });
        }
        if (functionName === "get_community_outfits_count") {
          return Promise.resolve({ data: null, error: countError });
        }
        return Promise.resolve({ data: null, error: null });
      });

      await expect(getCommunityOutfits(userId, validParams)).rejects.toThrow(
        CommunityServiceError,
      );
      await expect(getCommunityOutfits(userId, validParams)).rejects.toThrow(
        "Count query failed",
      );
    });

    it("should propagate LocationNotFoundError from getUserLocation", async () => {
      // Mock location not found
      const mockSingle = vi.fn().mockResolvedValue({
        data: null,
        error: { code: "PGRST116" },
      });
      const mockEq2 = vi.fn().mockReturnValue({ single: mockSingle });
      const mockEq1 = vi.fn().mockReturnValue({ eq: mockEq2 });
      const mockSelect = vi.fn().mockReturnValue({ eq: mockEq1 });
      mockSupabase.from.mockReturnValue({ select: mockSelect } as any);

      await expect(getCommunityOutfits(userId, validParams)).rejects.toThrow(
        LocationNotFoundError,
      );
    });
  });
});
