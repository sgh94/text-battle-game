// Helper function for API requests
export async function fetcher<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, options);
  
  if (!response.ok) {
    const error: any = new Error('API request failed');
    error.status = response.status;
    
    try {
      const data = await response.json();
      error.message = data.error || error.message;
    } catch (e) {
      // If response is not JSON, use status text
      error.message = response.statusText;
    }
    
    throw error;
  }
  
  return response.json();
}

// Function to make authenticated requests
export async function fetchWithAuth<T>(url: string, authHeader: string, options: RequestInit = {}): Promise<T> {
  const requestOptions: RequestInit = {
    ...options,
    headers: {
      ...options.headers,
      'Authorization': authHeader,
      'Content-Type': 'application/json',
    },
  };
  
  return fetcher<T>(url, requestOptions);
}
