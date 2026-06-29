require('dotenv').config();
const connectDB = require('./config/db');
const Admin = require('./models/Admin');
const News = require('./models/News');

const seed = async () => {
  await connectDB();

  const email = process.env.ADMIN_EMAIL || 'admin@inshort.com';
  const password = process.env.ADMIN_PASSWORD || 'Admin@123456';

  if (!(await Admin.findOne({ email }))) {
    await Admin.create({ email, password, name: 'Super Admin' });
    console.log(`Admin created: ${email} / ${password}`);
  }

  if ((await News.countDocuments()) === 0) {
    await News.insertMany([
      {
        heading: 'India launches new space mission successfully',
        paragraph: 'The national space agency completed its latest orbital launch, placing three satellites into low Earth orbit. Officials said the mission will improve rural connectivity and weather forecasting across the country.',
        category: 'Science',
        source: 'BriefNews',
        status: 'approved',
        isPublished: true,
        isTrending: true,
        originalLink: 'https://example.com/space-mission',
      },
      {
        heading: 'Tech giants announce AI safety partnership',
        paragraph: 'Major technology companies have agreed to share research on responsible AI development. The coalition aims to set industry standards for transparency, bias testing, and user privacy before the end of the year.',
        category: 'Technology',
        source: 'BriefNews',
        status: 'approved',
        isPublished: true,
        isTrending: true,
        originalLink: 'https://example.com/ai-safety',
      },
      {
        heading: 'Markets rally as inflation cools faster than expected',
        paragraph: 'Global stock indices rose after new data showed inflation falling for a third consecutive month. Analysts say central banks may pause rate hikes, boosting investor confidence in emerging markets.',
        category: 'Business',
        source: 'BriefNews',
        status: 'approved',
        isPublished: true,
        isTrending: true,
        originalLink: 'https://example.com/markets',
      },
      {
        heading: 'Parliament debates new economic reform bill',
        paragraph: 'Lawmakers clashed over a sweeping economic reform package aimed at boosting manufacturing and exports. Opposition leaders raised concerns about rural impact while the government defended job creation projections across key sectors.',
        category: 'Politics',
        source: 'BriefNews',
        status: 'approved',
        isPublished: true,
        isTrending: true,
        isControversial: true,
        imageUrl: 'https://picsum.photos/seed/politics/800/450',
      },
      {
        heading: 'India wins thrilling last-over cricket finish',
        paragraph: 'A dramatic final over sealed victory for the home team in a high-scoring T20 clash. The captain praised bowlers for holding nerve under pressure as fans celebrated across stadiums and social media worldwide.',
        category: 'Cricket',
        source: 'BriefNews',
        status: 'approved',
        isPublished: true,
        isTrending: true,
        imageUrl: 'https://picsum.photos/seed/cricket/800/450',
      },
      {
        heading: 'Archaeologists uncover ancient trade route artifacts',
        paragraph: 'Researchers found pottery and coins suggesting a forgotten trade corridor linked coastal ports to inland cities over two thousand years ago. Historians say the discovery reshapes understanding of regional commerce and cultural exchange.',
        category: 'History',
        source: 'BriefNews',
        status: 'approved',
        isPublished: true,
        imageUrl: 'https://picsum.photos/seed/history/800/450',
      },
    ]);
    console.log('Sample BriefNews news seeded (approved).');
  }

  process.exit(0);
};

seed().catch((e) => { console.error(e); process.exit(1); });
