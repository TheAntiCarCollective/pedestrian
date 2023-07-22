import { google } from "googleapis";

import { ProcessEnv } from "../constants";

export default google.youtube({
  auth: ProcessEnv.YOUTUBE_API_KEY,
  version: "v3",
});
