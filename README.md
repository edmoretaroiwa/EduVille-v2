# EduVille 2.0

A free, open education platform for African students studying ZIMSEC, BEC, and Cambridge.

**Motto:** Commit to Your Future

## Founders

- Edmore Taroiwa (Lead Developer)
- Benjamin Nyamukusa (Co-Founder)

## Tech Stack

- **Frontend:** Plain HTML, CSS, JavaScript
- **Backend:** Supabase (Postgres, Auth, Storage, Edge Functions)
- **AI:** Google Gemini 2.0 Flash
- **Hosting:** GitHub Pages
- **Domain:** eduvillelearning.africa
- **Videos:** YouTube (embedded)

## Folder Structure

## In-page PDF reader

The PDF Library now includes an in-page reader powered by PDF.js (downloaded from cdnjs only when a student first taps Read PDF). Students can page through documents, change zoom, close the reader, or open the original PDF in a separate tab. The original PDF URLs and library index remain unchanged.

### Deployment / troubleshooting

- Publish the updated `library.html`, `assets/css/library.css`, and `assets/js/library.js` files together.
- PDF.js fetches PDFs from `https://files.eduvillelearning.africa/`, so that file host must permit cross-origin GET requests from `https://eduvillelearning.africa` (and `https://www.eduvillelearning.africa` if you serve the site on both hosts). Configure the bucket's CORS policy to allow `GET` and `HEAD` from your site origin and expose the usual content/range headers if needed.
- If the file host blocks CORS or the PDF cannot be rendered, the reader displays a message and the student can still use **Open in new tab**.
- The reader requires an internet connection to load the PDF.js library from cdnjs.
