import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";
import dotenv from "dotenv";

dotenv.config();

const ai = new GoogleGenAI({
  apiKey: process.env.GEMINI_API_KEY,
  httpOptions: {
    headers: {
      'User-Agent': 'aistudio-build',
    }
  }
});

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Route: Smart Chatbot using Gemini API
  app.post("/api/chat", async (req, res) => {
    try {
      const { message, history } = req.body;
      
      if (!message) {
        return res.status(400).json({ error: "Message is required" });
      }

      // If no GEMINI_API_KEY, fallback to polite notification so it doesn't crash
      if (!process.env.GEMINI_API_KEY) {
        return res.json({ 
          text: "مرحباً! يبدو أن مفتاح Gemini API غير مفعّل حالياً في الإعدادات الفرعية للبرنامج. تواصل مع الإدارة لتفعيل الذكاء الاصطناعي المركزي.\n\nكبديل مؤقت للمساعدة: المعهد يرحب بكل استفساراتكم ويوفر دورات اللغات القانونية حضورياً بوسط ولاية أم البواقي وعن بُعد."
        });
      }

      // Setup general system instruction for a legal institute consultant chatbot in Algeria
      const systemInstruction = `أنت المستشار والبروفيسور الآلي الذكي لمعهد "CEILEGA" المختص بالتدريس والتكوين في اللغات القانونية والتوجيه التطبيقي بولاية أم البواقي، الجزائر.
أجب باللغة العربية باحترافية، وودية، وبأسلوب قانوني بليغ. وسهّل العبارات للطلاب والزوار السائلين.
معلومات عن المعهد وثوابته ومناهجه:
- المقر الرئيسي يقع بولاية أم البواقي العريقة.
- الاسم بالكامل: معهد CEILEGA للغات والعلوم القانونية المتخصصة.
- المدير والأساتذة الكبار: البروفيسور د. سليمان بوخالفة (مترجم معتمد وخبير القانون الدولي بالوزارة)، والأستاذة سميرة حيمر (مستشارة قانونية متخصصة بصياغة عقود الشركات والاستثمارات).
- الدورات المتاحة الحالية: الإنجليزية القانونية (Legal English)، فرنسية العقود وصياغتها الرسمية، الترجمة القانونية الرسمية المعتمدة، والمصطلحات القضائية والتحكيم الدولي التجاري.
- نمط الدراسة: دورات حضورية في قاعات ومخابر مجهزة ومريحة بوسط أم البواقي، بالإضافة إلى خيارات الدراسة التفاعلية عن بُعد (online).
- نظام التقييم والشهادات: الامتحانات تتكون من شق كتابي تحريري وآخر شفهي تطبيقي. تمنح شهادة التخرج الرسمية المعتمدة للطلبة المستحقين الذين يحققون مجموع 50/100 أو أكثر، وتكون الشهادة قابلة للتحميل والطباعة مباشرة من حساب الطالب وحفظها كملف PDF.
- العقود التمدرسية: يلتزم كل طالب مسجل بالمصادقة وتوقيع عقد التمدرس إلكترونياً من لوحته التعليمية لتفعيل مقعده وتسجيله النهائي.
- المعهد يوفر أيضاً بطاقة طالب رسمية رقمية مطروحة وشهادات تسجيل مؤقتة.

تجاوب بذكاء واشرح المصطلحات القانونية أو الترجمات القانونية الفريدة إن طلب السائل ذلك باللغات العربية، الإنجليزية أو الفرنسية، مع تفهم الأسئلة وتزويد السائلين بإجابات شاملة ومقنعة.`;

      // Structure chat contents
      const contents = [];
      if (history && Array.isArray(history)) {
        // filter out messages to ensure structured prompt format
        const validHistory = history.slice(-10); // keep last 10 messages for context
        for (const turn of validHistory) {
          contents.push({
            role: turn.sender === 'user' ? 'user' : 'model',
            parts: [{ text: turn.text }]
          });
        }
      }
      contents.push({
        role: 'user',
        parts: [{ text: message }]
      });

      const response = await ai.models.generateContent({
        model: "gemini-3.5-flash",
        contents: contents,
        config: {
          systemInstruction: systemInstruction,
          temperature: 0.7,
        }
      });

      res.json({ text: response.text });
    } catch (error: any) {
      console.error("Gemini API Error:", error);
      res.status(500).json({ error: error.message || "حدث خطأ أثناء معالجة طلبك" });
    }
  });

  // Serve static assets in production, otherwise use Vite middleware
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on port ${PORT}`);
  });
}

startServer();
