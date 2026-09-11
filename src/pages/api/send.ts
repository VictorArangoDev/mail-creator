import type { APIRoute } from "astro";

const MAIL_API_URL = import.meta.env.ENDPOINT;



export const POST: APIRoute = async ({ request }) => {
  try {
    const {
      to,
      subject,
      templateId,
      clientName,
      productName,
      idCycle,
      idTransmision,
      fecha,
      messageFields,
    } = await request.json();

    const payload = {
      emailInfo: {
        clientMessageId: null,
        clientMailingId: null,
        subject,
        sender: "notificaciones@cadenaemail.com",
        mask: "Cadena",
        recipient: to,
        htmlbody: String(templateId),

        messageFields: 
          messageFields
        ,

        attachments: [],
        urls: null,
        idUnico: null,
      },

      customer: "5X",
      product: "email",
      channel: "email-channel-soketlabs",
      supplierCode: "6426fb75931aa2a435d61462",
      clientMessageId: crypto.randomUUID(),
      clientMailingId: null,
      validateBlackList: false,

      ProcessInfo: {
        IdTransmision: idTransmision,
        Channel: "Preprocessing",
        Part: 0,
        IdCycle: idCycle,
      },
    };

  
    console.log("Payload:" + JSON.stringify(payload))

    const response = await fetch(MAIL_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    const responseText = await response.text();

  

    if (!response.ok) {
      return new Response(
        JSON.stringify({
          error: responseText,
        }),
        {
          status: response.status,
          headers: {
            "Content-Type": "application/json",
          },
        }
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        response: responseText,
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    console.error(error);

    return new Response(
      JSON.stringify({
        error:
          error instanceof Error
            ? error.message
            : "Error desconocido",
      }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
        },
      }
    );
  }
};