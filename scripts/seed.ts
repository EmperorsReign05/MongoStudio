import mongoose from 'mongoose';
import * as dotenv from 'dotenv';
import path from 'path';

// Load environment variables
dotenv.config({ path: path.resolve(process.cwd(), '.env.local') });

const MONGODB_URI = process.env.MONGODB_URI || 'mongodb://localhost:27017/mongoblocks';

const StudentSchema = new mongoose.Schema({
  name: { type: String, required: true },
  age: { type: Number, required: true },
  major: { type: String, required: true },
  gpa: { type: Number, required: true },
  contact: {
    email: { type: String, required: true },
    phone: { type: String, required: true },
  },
  courses: [{ type: String }],
});

const MovieSchema = new mongoose.Schema({
  title: { type: String, required: true },
  year: { type: Number, required: true },
  director: { type: String, required: true },
  genres: [{ type: String }],
  imdb: {
    rating: { type: Number },
    votes: { type: Number },
  },
});

const Student = mongoose.models.Student || mongoose.model('Student', StudentSchema);
const Movie = mongoose.models.Movie || mongoose.model('Movie', MovieSchema);

const studentsData = [
  {
    name: 'Alice Johnson',
    age: 20,
    major: 'Computer Science',
    gpa: 3.8,
    contact: { email: 'alice@example.com', phone: '555-0100' },
    courses: ['Database Systems', 'Algorithms', 'Web Development'],
  },
  {
    name: 'Bob Smith',
    age: 22,
    major: 'Mathematics',
    gpa: 3.5,
    contact: { email: 'bob@example.com', phone: '555-0101' },
    courses: ['Calculus', 'Linear Algebra'],
  },
  {
    name: 'Charlie Davis',
    age: 21,
    major: 'Computer Science',
    gpa: 3.9,
    contact: { email: 'charlie@example.com', phone: '555-0102' },
    courses: ['Operating Systems', 'Algorithms'],
  },
  {
    name: 'Diana Prince',
    age: 19,
    major: 'Physics',
    gpa: 3.6,
    contact: { email: 'diana@example.com', phone: '555-0103' },
    courses: ['Quantum Mechanics', 'Thermodynamics'],
  }
];

const moviesData = [
  {
    title: 'The Matrix',
    year: 1999,
    director: 'Lana Wachowski, Lilly Wachowski',
    genres: ['Action', 'Sci-Fi'],
    imdb: { rating: 8.7, votes: 1700000 },
  },
  {
    title: 'Inception',
    year: 2010,
    director: 'Christopher Nolan',
    genres: ['Action', 'Adventure', 'Sci-Fi'],
    imdb: { rating: 8.8, votes: 2100000 },
  },
  {
    title: 'Interstellar',
    year: 2014,
    director: 'Christopher Nolan',
    genres: ['Adventure', 'Drama', 'Sci-Fi'],
    imdb: { rating: 8.6, votes: 1500000 },
  }
];

async function seed() {
  console.log(`Connecting to ${MONGODB_URI}`);
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('Connected to Database successfully.');

    await Student.deleteMany({});
    console.log('Cleared students collection');
    
    await Movie.deleteMany({});
    console.log('Cleared movies collection');

    await Student.insertMany(studentsData);
    console.log('Inserted students data');

    await Movie.insertMany(moviesData);
    console.log('Inserted movies data');

    console.log('Seeding completed successfully!');
    process.exit(0);
  } catch (err) {
    console.error('Error seeding database:', err);
    process.exit(1);
  }
}

seed();
