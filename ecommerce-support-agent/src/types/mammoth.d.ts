declare module 'mammoth' {
  export interface RawTextResult {
    value: string;
    messages: any[];
  }

  export interface HtmlResult {
    value: string;
    messages: any[];
  }

  export function extractRawText(options: { path?: string; buffer?: Buffer }): Promise<RawTextResult>;
  export function convertToHtml(options: { path?: string; buffer?: Buffer }): Promise<HtmlResult>;
}
