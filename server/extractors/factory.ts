import { AppError } from "../core/errors/AppError.ts";
import {
  assertPublicProductUrl,
  normalizeImportPrompt,
  normalizeProductUrl,
} from "../imports/productUrlPolicy.ts";
import { IProductExtractor } from "./base.ts";
import { ShopifyExtractor } from "./shopify.ts";
import { WooCommerceExtractor } from "./woocommerce.ts";
import { AmazonExtractor } from "./amazon.ts";
import { AliExpressExtractor } from "./aliexpress.ts";
import { AlibabaExtractor } from "./alibaba.ts";
import { EBayExtractor } from "./ebay.ts";

class PolicyEnforcedExtractor implements IProductExtractor {
  public readonly providerName: string;

  constructor(private readonly inner: IProductExtractor) {
    this.providerName = inner.providerName;
  }

  public async extract(url: string, _rawHtml?: string, customPrompt?: string) {
    const safeUrl = await assertPublicProductUrl(url);
    const normalizedPrompt = normalizeImportPrompt(customPrompt);

    // Browser-supplied HTML is deliberately ignored. Only the verified public URL
    // may be fetched by the server-side extractor.
    return this.inner.extract(safeUrl, undefined, normalizedPrompt);
  }

  public validate(product: Parameters<IProductExtractor["validate"]>[0]) {
    return this.inner.validate(product);
  }
}

function wrap(extractor: IProductExtractor): IProductExtractor {
  return new PolicyEnforcedExtractor(extractor);
}

export class ExtractorFactory {
  public static getExtractor(url: string): IProductExtractor {
    const parsed = new URL(normalizeProductUrl(url));
    const hostname = parsed.hostname.toLowerCase();
    const pathname = parsed.pathname.toLowerCase();
    const query = parsed.search.toLowerCase();

    if (
      hostname.includes("woocommerce") ||
      pathname.includes("/wp-json/") ||
      query.includes("add-to-cart=") ||
      /\/product\/[^/?#]+\/?$/.test(pathname)
    ) {
      return wrap(new WooCommerceExtractor());
    }

    if (
      hostname.includes("shopify") ||
      hostname.endsWith(".myshopify.com") ||
      /\/products\/[^/?#]+/.test(pathname)
    ) {
      return wrap(new ShopifyExtractor());
    }

    if (hostname.includes("amazon.") || hostname === "amzn.to" || hostname.endsWith(".amzn.to")) {
      return wrap(new AmazonExtractor());
    }
    if (hostname.includes("aliexpress.")) return wrap(new AliExpressExtractor());
    if (hostname.includes("alibaba.")) return wrap(new AlibabaExtractor());
    if (hostname.includes("ebay.")) return wrap(new EBayExtractor());

    throw new AppError("This store platform is not supported yet.", 422, {
      code: "UNSUPPORTED_PRODUCT_PROVIDER",
      hostname,
    });
  }
}
