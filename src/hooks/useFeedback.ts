import { useState, useCallback } from 'react';
import type {
  FeedbackFormViewModel,
  RecommendationDTO,
  CreateFeedbackCommand,
  FeedbackDTO,
  ApiError,
  OutfitDTO,
  ZoneRatings,
} from '../types';

/**
 * Custom hook for managing feedback form state and submission
 */
export function useFeedback(recommendation: RecommendationDTO) {
  const [formState, setFormState] = useState<FeedbackFormViewModel>({
    followedRecommendation: 'yes',
    actualOutfit: recommendation.recommendation,
    overallRating: 3,
    zoneRatings: {},
    notes: '',
    shareWithCommunity: true, // Default based on user profile settings
  });

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<ApiError | null>(null);

  // Update form state
  const updateFormState = useCallback((updates: Partial<FeedbackFormViewModel>) => {
    setFormState(prev => ({ ...prev, ...updates }));
  }, []);

  // Reset form to initial state
  const resetForm = useCallback(() => {
    setFormState({
      followedRecommendation: 'yes',
      actualOutfit: recommendation.recommendation,
      overallRating: 3,
      zoneRatings: {},
      notes: '',
      shareWithCommunity: true,
    });
    setIsSubmitting(false);
    setSubmitted(false);
    setError(null);
  }, [recommendation.recommendation]);

  // Submit feedback
  const submit = useCallback(async (): Promise<FeedbackDTO | undefined> => {
    setIsSubmitting(true);
    setError(null);

    try {
      const command: CreateFeedbackCommand = {
        // location_id: recommendation.weather.location_id, // TODO: Add location_id to WeatherDTO or get from filters
        temperature: recommendation.weather.temperature,
        feels_like: recommendation.weather.feels_like,
        wind_speed: recommendation.weather.wind_speed,
        humidity: recommendation.weather.humidity,
        rain_mm: recommendation.weather.rain_mm,
        activity_type: formState.followedRecommendation === "yes"
          ? "spokojna" // TODO: Get from current filters
          : "spokojna", // TODO: Get from current filters
        duration_minutes: 90, // TODO: Get from current filters
        actual_outfit: formState.actualOutfit,
        overall_rating: formState.overallRating,
        zone_ratings: formState.zoneRatings,
        notes: formState.notes || undefined,
        shared_with_community: formState.shareWithCommunity,
      };

      const response = await fetch('/api/feedbacks', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(command),
      });

      if (!response.ok) {
        const errorData = await response.json();
        const apiError: ApiError = {
          code: errorData.error?.code || 'VALIDATION_ERROR',
          message: errorData.error?.message || 'Wystąpił błąd podczas zapisywania feedbacku',
          statusCode: response.status,
          details: errorData.error?.details,
        };
        throw apiError;
      }

      const feedback: FeedbackDTO = await response.json();

      setSubmitted(true);
      setIsSubmitting(false);

      return feedback;
    } catch (error) {
      const apiError = error as ApiError;
      setError(apiError);
      setIsSubmitting(false);
      throw error;
    }
  }, [recommendation, formState]);

  // Validate form
  const validateForm = useCallback((): boolean => {
    // Overall rating is required
    if (formState.overallRating < 1 || formState.overallRating > 5) {
      return false;
    }

    // Actual outfit must have all zones
    const requiredZones: (keyof OutfitDTO)[] = ['head', 'torso', 'arms', 'hands', 'legs', 'feet', 'neck'];
    for (const zone of requiredZones) {
      if (!formState.actualOutfit[zone]) {
        return false;
      }
    }

    // Torso must have base, mid, outer
    if (!formState.actualOutfit.torso.base || !formState.actualOutfit.torso.mid || !formState.actualOutfit.torso.outer) {
      return false;
    }

    // Feet must have socks (covers optional)
    if (!formState.actualOutfit.feet.socks) {
      return false;
    }

    return true;
  }, [formState]);

  return {
    formState,
    setFormState: updateFormState,
    isSubmitting,
    submitted,
    error,
    submit,
    resetForm,
    validateForm,
  };
}
