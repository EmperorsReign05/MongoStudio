# MongoBlocks

MongoBlocks is a visual, drag-and-drop educational query builder for MongoDB. Connect blocks together to form a syntax tree, instantly generate MongoDB code, and execute it against a live database!

## Prerequisites

Before setting up the project, make sure you have:
1. **Node.js** (v18 or higher recommended)
2. **MongoDB Atlas Account**: You need a running MongoDB cluster.
3. **Whitelisted IP**: Ensure your IP address is whitelisted in your MongoDB Atlas dashboard (`Network Access` tab -> `Add IP Address`).

## Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Environment Variables
Create a file named `.env.local` in the root of the project. Add your MongoDB connection string to it:
```env
MONGODB_URI="mongodb+srv://<username>:<password>@<cluster-url>/?retryWrites=true&w=majority&appName=Cluster0"
```
*(Make sure to replace `<username>`, `<password>`, and `<cluster-url>` with your actual Atlas credentials).*

### 3. Seed the Database
Before running queries, you need to populate your database with our demo datasets (`Students` and `Movies`). Run the seed script:
```bash
npm run seed
```
*Note: This will clear existing data in the `students` and `movies` collections.*

### 4. Run the Development Server
```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) with your browser to see the result. Drag and drop blocks from the sidebar onto the canvas, connect them, and hit **Run Query**!
