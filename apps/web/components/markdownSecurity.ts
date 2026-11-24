import { defaultUrlTransform } from "react-markdown";
import rehypeSanitize from "rehype-sanitize";

export const markdownRehypePlugins = [rehypeSanitize];
export const markdownUrlTransform = defaultUrlTransform;
