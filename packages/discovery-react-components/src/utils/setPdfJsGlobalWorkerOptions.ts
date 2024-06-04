// import * as PdfjsLib from 'pdfjs-dist';
import * as PdfjsLib from 'pdfjs-dist/webpack.mjs';

// Make fields from GlobalWorkerOptions optional
type GlobalWorkerOptionsDelta = {
  workerPort?: Worker;
  workerSrc?: string;
};

const setPdfJsGlobalWorkerOptions = (options: GlobalWorkerOptionsDelta): void => {
  for (const [option, value] of Object.entries(options)) {
    // @ts-expect-error
    PdfjsLib.GlobalWorkerOptions[option] = value;
  }
};

export default setPdfJsGlobalWorkerOptions;
