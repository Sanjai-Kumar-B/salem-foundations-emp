import { Lead, WhatsAppTemplate } from '@/types';

/**
 * Replace placeholders in the WhatsApp template content with actual Lead data.
 * @param template The template object
 * @param lead The active Lead model
 */
export function generateWhatsAppMessage(
    template: WhatsAppTemplate,
    lead: Lead,
    counsellor?: { name?: string; phone?: string }
): string {
    let message = template.content;

    // Supported variables configuration
    const variables: Record<string, string> = {
        name: lead.name || '',
        mobile: lead.mobile || '',
        course: lead.course || '',
        location: lead.location || '',
        district: lead.district || '',
        applicationNumber: lead.applicationNumber || '',
        counsellorName: counsellor?.name || 'Salem Foundations Admissions',
        counsellorPhone: counsellor?.phone || '',
    };

    // Parse and replace generic bracketed placeholders i.e. {name} or {{name}}
    for (const [key, value] of Object.entries(variables)) {
        const singleBrace = new RegExp(`{${key}}`, 'gi');
        const doubleBrace = new RegExp(`{{${key}}}`, 'gi');
        message = message.replace(doubleBrace, value).replace(singleBrace, value);
    }

    return message;
}

/**
 * Returns a fully formed WhatsApp deep link to open in device.
 * Strips non-digit chars from mobile for standard WA dialing sequence.
 */
export function getWhatsAppLink(
    lead: Lead,
    template: WhatsAppTemplate,
    counsellor?: { name?: string; phone?: string }
): string {
    let formattedPhone = (lead.mobile || '').replace(/\D/g, ''); // Extract purely digits
    if (formattedPhone.length === 10) {
        formattedPhone = `91${formattedPhone}`;
    }
    const prefilledMessage = generateWhatsAppMessage(template, lead, counsellor);
    
    // Encodes characters like space (%20)
    const encodedMessage = encodeURIComponent(prefilledMessage);
    
    return `https://wa.me/${formattedPhone}?text=${encodedMessage}`;
}

export function getDirectWhatsAppLink(phone: string, message: string): string {
    const formattedPhone = (phone || '').replace(/\D/g, '');
    const encoded = encodeURIComponent(message);
    return `https://wa.me/${formattedPhone}?text=${encoded}`;
}
