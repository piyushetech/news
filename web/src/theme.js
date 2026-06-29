export const CATEGORY_COLORS = {
  Politics: '#7c3aed',
  Cricket: '#16a34a',
  History: '#b45309',
  World: '#0284c7',
  Technology: '#6366f1',
  Business: '#0891b2',
  Sports: '#059669',
  Science: '#7c3aed',
  Entertainment: '#db2777',
  National: '#ea580c',
  City: '#64748b',
  Crime: '#dc2626',
};

export const CATEGORY_EMOJI = {
  Cricket: '🏏',
  Crime: '🚨',
  Politics: '🏛️',
};

export function categoryColor(category) {
  return CATEGORY_COLORS[category] || '#ff7a1a';
}

export function categoryEmoji(category) {
  return CATEGORY_EMOJI[category] || '📰';
}
