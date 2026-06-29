export type RootStackParamList = {
  Login: undefined;
  Preferences: undefined;
  DailyBriefing: undefined;
  Home: undefined;
  Detail: { news: import('../services/api').NewsItem; scrollToDeepDive?: boolean };
};
