import { Share, Platform } from 'react-native';
import { NewsItem } from './api';

export async function shareNewsStory(item: NewsItem): Promise<void> {
  const summary =
    item.paragraph?.trim() && item.paragraph.trim() !== item.heading.trim()
      ? item.paragraph.trim()
      : '';
  const link = item.originalLink?.trim();

  const lines = [
    `📰 BriefNews · ${item.category}`,
    '',
    item.heading,
  ];

  if (summary) {
    lines.push('', summary);
  }

  if (link) {
    lines.push('', `Read full story: ${link}`);
  }

  lines.push('', '— Shared via BriefNews');

  const message = lines.join('\n');

  try {
    await Share.share(
      Platform.select({
        ios: { message, url: link, title: item.heading },
        android: { message, title: item.heading },
        default: { message, title: item.heading },
      })!,
    );
  } catch {
    /* user dismissed */
  }
}
