import { GoogleGenAI, Type } from "@google/genai";
import { User, Location, Shift, Role } from "../types";

const getDayName = (dateStr: string) => new Date(dateStr).toLocaleDateString('en-US', { weekday: 'long' });

export const generateSmartSchedule = async (
  users: User[],
  location: Location,
  weekStartDate: string
): Promise<Partial<Shift>[]> => {
  const apiKey = process.env.API_KEY;
  if (!apiKey) {
    console.error("API Key missing");
    return [];
  }

  const eligibleUsers = users.filter(u => u.eligibleLocationIds?.includes(location.id));

  if (eligibleUsers.length === 0) {
      console.warn("No eligible staff found for this location");
      return [];
  }

  const ai = new GoogleGenAI({ apiKey });

  const prompt = `
    You are an expert HR Scheduler. Create a work schedule for location "${location.name}" for the FULL 7-DAY WEEK starting ${weekStartDate}.
    
    The available staff for this location is:
    ${JSON.stringify(eligibleUsers.map(u => ({ id: u.id, name: u.name, role: u.role })))}

    Rules:
    1. Shop needs at least 1 Manager (General Manager, Shop Manager) OR 1 Service Advisor per day.
    2. Shop needs at least 1 Technician per day.
    3. Standard shifts are around 8 hours. You can use 15, 30, or 45 minute offsets (e.g., 8:30 AM to 5:15 PM).
    4. Create shifts for Monday through Sunday (dayOffset 0 to 6).
    5. Aim for approximately 40 hours per week for full-time staff.
    
    Return a JSON array of shift objects.
  `;

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: prompt,
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              userId: { type: Type.STRING },
              dayOffset: { type: Type.INTEGER, description: "0 for Monday, 6 for Sunday" },
              startHour: { type: Type.INTEGER },
              startMinute: { type: Type.INTEGER, description: "0, 15, 30, or 45" },
              endHour: { type: Type.INTEGER },
              endMinute: { type: Type.INTEGER, description: "0, 15, 30, or 45" },
              title: { type: Type.STRING }
            },
            required: ["userId", "dayOffset", "startHour", "startMinute", "endHour", "endMinute", "title"]
          }
        }
      }
    });

    const generatedData = JSON.parse(response.text || "[]");
    const startObj = new Date(weekStartDate);
    
    return generatedData.map((item: any) => {
        const shiftDate = new Date(startObj);
        shiftDate.setDate(startObj.getDate() + item.dayOffset);
        
        const start = new Date(shiftDate);
        start.setHours(item.startHour, item.startMinute || 0, 0);
        
        const end = new Date(shiftDate);
        end.setHours(item.endHour, item.endMinute || 0, 0);

        return {
            userId: item.userId,
            locationId: location.id,
            start: start.toISOString(),
            end: end.toISOString(),
            title: item.title,
            locked: false
        };
    });

  } catch (error) {
    console.error("Error generating schedule:", error);
    return [];
  }
};

export const draftEmailNotification = async (
  recipientName: string,
  changeType: string,
  status: string
): Promise<{ subject: string, body: string }> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return { 
        subject: `Schedule Update: ${changeType}`, 
        body: `Hi ${recipientName}, your ${changeType} request has been ${status}.` 
    };

    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Draft a professional email for an employee named ${recipientName}. 
            The status of their "${changeType}" request is now "${status}". 
            Return the output in a JSON format with 'subject' and 'body' fields.`,
            config: {
                responseMimeType: "application/json",
                responseSchema: {
                    type: Type.OBJECT,
                    properties: {
                        subject: { type: Type.STRING },
                        body: { type: Type.STRING }
                    },
                    required: ["subject", "body"]
                }
            }
        });
        const res = JSON.parse(response.text || "{}");
        return {
            subject: res.subject || `Schedule Request: ${status}`,
            body: res.body || `Your request for ${changeType} has been ${status}.`
        };
    } catch (e) {
        return { 
            subject: `Update: ${changeType} Request`, 
            body: `Hi ${recipientName}, your request has been ${status}. Check the app for details.` 
        };
    }
}

export const draftNotification = async (
  recipientName: string,
  changeType: string,
  status: string
): Promise<string> => {
    const apiKey = process.env.API_KEY;
    if (!apiKey) return `Notification: Your ${changeType} request has been ${status}.`;

    const ai = new GoogleGenAI({ apiKey });
    
    try {
        const response = await ai.models.generateContent({
            model: "gemini-3-flash-preview",
            contents: `Draft a professional, short notification message for employee ${recipientName}. 
            Topic: Their request for "${changeType}" was "${status}". 
            Tone: Professional and concise.`,
        });
        return response.text || "";
    } catch (e) {
        return `Update: Your request was ${status}.`;
    }
}
