export type FlowerStory = {
  summary: string; habitat: string; origin: string; season: string;
  features: string; meaningOrigin: string; legend: string; art: string;
};
export type FlowerResult = {
  name: string; language: string; nameEn?: string; languageEn?: string;
  story?: FlowerStory; scientificName?: string; confidence?: 'high' | 'medium' | 'low';
};
export type FlowerCard = FlowerResult & {
  id: string; image: string; story?: FlowerStory; memo?: string; createdAt: string;
};
