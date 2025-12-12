import { ToastType } from "../types";

// Função helper para disparar o evento customizado
export const showToast = (message: string, type: ToastType = 'success') => {
    const event = new CustomEvent('show-toast', { 
        detail: { message, type, id: Date.now().toString() } 
    });
    window.dispatchEvent(event);
};