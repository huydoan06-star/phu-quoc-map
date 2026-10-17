# data/spots.json

```json
{
  "spots": [
    {
      "id": "sao-beach",                 // unique, url-safe; used in #spot=<id>
      "status": "published",             // "published" | "draft" (drafts are hidden)
      "category": "beach",               // beach | sunset | food | market | nature | viewpoint | culture | nightlife | safety
      "lat": 10.05247, "lng": 104.03519, // WGS84; null = hidden (needsLocation)
      "needsLocation": true,             // optional, set by the import tool when the photo had no GPS
      "capturedAt": "2026-10-17T17:45:00+07:00",  // ISO with offset, or null
      "photos": [
        { "src": "photos/<id>-1.webp", "thumb": "photos/<id>-1-sm.webp", "width": 1600, "height": 1067,
          "placeholder": false, "alt": { "en": "…" } }
      ],
      "name":     { "en": "…", "vi": "…", "ko": "…", "zh-CN": "…", "zh-TW": "…", "ja": "…", "hi": "…", "ru": "…" },
      "guide":    { "en": "…" },
      "tips":     { "en": "…" },
      "bestTime": { "en": "…" },
      "links": [],                       // affiliate/partner links later: [{ "type", "label": {"en"}, "url" }]
      "youtube": null,                   // optional video URL
      "source": "seed" | "them-anh"
    }
  ]
}
```

Text fields are per-language objects. Lookup: active language → `en` → `vi` → first value. Only `en` is required.
The site shows a spot only if `status` is `published` **and** `lat`/`lng` are numbers.
Capture time is displayed in the visitor's language, in Vietnam time (UTC+7).
