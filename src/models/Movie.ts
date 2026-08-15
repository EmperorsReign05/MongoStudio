import mongoose, { Schema, Document } from 'mongoose';

export interface IMovie extends Document {
  title: string;
  year: number;
  director: string;
  genres: string[];
  imdb: {
    rating: number;
    votes: number;
  };
}

const MovieSchema: Schema = new Schema({
  title: { type: String, required: true },
  year: { type: Number, required: true },
  director: { type: String, required: true },
  genres: [{ type: String }],
  imdb: {
    rating: { type: Number },
    votes: { type: Number },
  },
});

export default mongoose.models.Movie || mongoose.model<IMovie>('Movie', MovieSchema);
