// Simple authentication service

export const authService = {
  isAuthenticated: () => {
    const token = localStorage.getItem('token');
    return !!token;
  },
  
  getUser: () => {
    try {
      const userDataString = localStorage.getItem('user');
      if (userDataString) {
        return JSON.parse(userDataString);
      }
      return null;
    } catch (error) {
      console.error('Error retrieving user data:', error);
      return null;
    }
  },
  
  getToken: () => {
    return localStorage.getItem('token');
  },
  
  setAuth: (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
  },
  
  clearAuth: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
  },

  updateUserInfo: (userData) => {
    const token = localStorage.getItem('token');
    if (token) {
      localStorage.setItem('user', JSON.stringify(userData));
    }
  }
};

export default authService;