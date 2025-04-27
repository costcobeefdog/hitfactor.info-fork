import mongoose, { Schema } from "mongoose";

export interface AfterUploadClassifier {
  classifierDivision: string;
  classifier: string;
  division: string;
  name: string;
}

const AfterUploadClassifierSchema = new Schema<AfterUploadClassifier>(
  {
    classifierDivision: String,
    classifier: String,
    division: String,
    name: String,
  },
  { strict: false },
);

export const AfterUploadClassifiers = mongoose.model(
  "AfterUploadClassifiers",
  AfterUploadClassifierSchema,
);
