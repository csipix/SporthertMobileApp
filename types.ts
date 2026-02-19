
export enum ViewType {
  AGAK = 'AGAK',
  SAJAT = 'SAJAT',
  HUB = 'HUB'
}

export interface SportBranch {
  id: string;
  name: string;
  icon: string;
  description: string;
  popularity: number;
}

export interface UserStats {
  workoutsThisWeek: number;
  activeMinutes: number;
  caloriesBurned: number;
  streak: number;
}

export interface HubPost {
  id: string;
  author: string;
  content: string;
  timestamp: string;
  likes: number;
  image?: string;
}
