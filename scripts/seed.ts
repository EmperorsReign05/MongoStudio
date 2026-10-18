import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });
const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/mongoblocks';

const students = [
  ['Aarav Mehta', 21, 'Computer Science', 8.6, 'Jaipur'],
  ['Diya Sharma', 20, 'Physics', 8.2, 'Delhi'],
  ['Kabir Khan', 22, 'Mathematics', 7.8, 'Mumbai'],
  ['Mira Shah', 21, 'Computer Science', 9.1, 'Delhi'],
  ['Rohan Iyer', 19, 'Economics', 7.4, 'Bengaluru'],
  ['Ananya Das', 20, 'Computer Science', 8.9, 'Kolkata'],
].map(([name, age, major, gpa, city], index) => ({
  name, age, major, gpa,
  contact: { email: String(name).toLowerCase().replace(' ', '.') + '@example.edu', phone: '555-01' + index, city },
  courses: [{ code: 'DB201', score: 78 + index * 2 }, { code: 'CS301', score: 82 + index }],
  skills: index % 2 ? ['MongoDB', 'Python'] : ['MongoDB', 'TypeScript'],
}));

const products = [
  ['Atlas Backpack', 'Travel', 1499, 32, 4.5],
  ['Nimbus Bottle', 'Lifestyle', 799, 58, 4.2],
  ['Orbit Headphones', 'Electronics', 3499, 18, 4.7],
  ['Pixel Notebook', 'Stationery', 249, 120, 4.1],
  ['Terra Lamp', 'Home', 2199, 15, 4.4],
  ['Vector Mouse', 'Electronics', 1299, 44, 4.6],
].map(([name, category, price, stock, rating], index) => ({
  _id: new mongoose.Types.ObjectId(),
  sku: 'PRD-' + String(index + 1).padStart(3, '0'),
  name, category, price, stock, rating,
  tags: [String(category).toLowerCase(), index % 2 ? 'popular' : 'new'],
}));

const sandbox = [
  { title: 'Draft onboarding lesson', status: 'todo', score: 4, tags: ['learning'], details: { note: 'safe to change', owner: 'team' } },
  { title: 'Test aggregation card', status: 'review', score: 7, tags: ['ui', 'query'], details: { note: 'safe to delete', owner: 'team' } },
];

async function seed(): Promise<void> {
  await mongoose.connect(mongoUri);
  const database = mongoose.connection.db!;
  const orders = Array.from({ length: 18 }, (_, index) => {
    const first = products[index % products.length];
    const second = products[(index + 2) % products.length];
    return {
      orderNo: 'ORD-' + String(1001 + index),
      customer: { name: ['Mira Shah', 'Aarav Mehta', 'Diya Sharma'][index % 3], city: ['Delhi', 'Jaipur', 'Mumbai'][index % 3] },
      items: [
        { productId: first._id, quantity: (index % 3) + 1, unitPrice: first.price },
        { productId: second._id, quantity: 1, unitPrice: second.price },
      ],
      status: index % 4 === 0 ? 'processing' : index % 4 === 1 ? 'shipped' : 'delivered',
      orderedAt: new Date(Date.UTC(2026, index % 6, (index % 25) + 1)),
    };
  });

  for (const name of ['students', 'products', 'orders', 'sandbox']) await database.collection(name).deleteMany({});
  await database.collection('students').insertMany(students);
  await database.collection('products').insertMany(products);
  await database.collection('orders').insertMany(orders);
  await database.collection('sandbox').insertMany(sandbox);

  await Promise.all([
    database.collection('students').createIndex({ major: 1, gpa: -1 }),
    database.collection('students').createIndex({ 'contact.city': 1 }),
    database.collection('products').createIndex({ category: 1, price: 1 }),
    database.collection('orders').createIndex({ status: 1, orderedAt: -1 }),
    database.collection('orders').createIndex({ 'items.productId': 1 }),
  ]);

  console.log('MongoBlocks demo data reset: students, products, orders, sandbox.');
  await mongoose.disconnect();
}

seed().catch(async (error: unknown) => {
  console.error('MongoBlocks seed failed:', error);
  await mongoose.disconnect();
  process.exitCode = 1;
});
