import { Lead, WhatsAppTemplate } from '@/types';

/**
 * Replace placeholders in the WhatsApp template content with actual Lead data.
 * @param template The template object
 * @param lead The active Lead model
 */
export function generateWhatsAppMessage(template: WhatsAppTemplate, lead: Lead): string {
    let message = template.content;

    // Supported variables configuration
    const variables: Record<string, string> = {
        name: lead.name || '',
        mobile: lead.mobile || '',
        course: lead.course || '',
        location: lead.location || '',
    };

    // Parse and replace generic bracketed placeholders i.e. {name}
    for (const [key, value] of Object.entries(variables)) {
        const regex = new RegExp(`{${key}}`, 'gi');
        message = message.replace(regex, value);
    }

    return message;
}

/**
 * Returns a fully formed WhatsApp deep link to open in device.
 * Strips non-digit chars from mobile for standard WA dialing sequence.
 */
export function getWhatsAppLink(lead: Lead, template: WhatsAppTemplate): string {
    const formattedPhone = lead.mobile.replace(/\D/g, ''); // Extract purely digits
    const prefilledMessage = generateWhatsAppMessage(template, lead);
    
    // Encodes characters like space (%20)
    const encodedMessage = encodeURIComponent(prefilledMessage);
    
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}