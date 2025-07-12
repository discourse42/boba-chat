# Boba Chat

A basic Claude chat wrapper built with React, TypeScript, and Express.js. 

I built this while half-watching that Boba Fett show on Disney. I thought it might be good like Andor, but it was just passable. Kind of like this app.

## ✨ Features

### 🔧 **Modern Architecture**
- **Frontend**: React 19 + TypeScript + Vite for fast development and optimal builds
- **Backend**: Express.js with TypeScript for type-safe server-side development
- **Database**: SQLite for reliable session and message persistence
- **Authentication**: JWT-based authentication system

### 🛡️ **Enhanced Security**
- JWT token-based authentication (replaces hardcoded passwords)
- Comprehensive input validation and sanitization
- CSRF protection and security headers via Helmet.js
- Rate limiting for API protection
- Secure password hashing with bcrypt

### 🎨 **Improved User Experience**
- Real-time streaming chat responses
- Session management with persistent storage
- Sidebar navigation for conversation history
- Responsive design for mobile and desktop
- Auto-expanding input with keyboard shortcuts

### 🚀 **Performance & Reliability**
- Optimized React components with proper state management
- Context API for global state
- Custom hooks for reusable logic
- Error boundaries and comprehensive error handling
- Compression and caching optimizations

## 🏗️ **Project Structure**

```
├── src/                          # Frontend source code
│   ├── components/               # React components
│   │   ├── LoginForm.tsx        # Authentication form
│   │   ├── Sidebar.tsx          # Session navigation
│   │   ├── ChatInterface.tsx    # Main chat interface
│   │   ├── ChatMessage.tsx      # Individual message display
│   │   └── ChatInput.tsx        # Message input component
│   ├── contexts/                 # React contexts
│   │   └── AuthContext.tsx      # Authentication state management
│   ├── hooks/                    # Custom React hooks
│   │   └── useChat.ts           # Chat functionality hook
│   ├── services/                 # API services
│   │   └── api.ts               # API communication layer
│   ├── types/                    # TypeScript type definitions
│   │   └── index.ts             # Shared interfaces
│   ├── App.tsx                   # Main application component
│   ├── App.css                   # Application styles
│   └── main.tsx                  # React app entry point
├── server/                       # Backend source code
│   ├── routes/                   # Express route handlers
│   │   ├── auth.ts              # Authentication endpoints
│   │   ├── chat.ts              # Chat streaming endpoints
│   │   ├── sessions.ts          # Session management
│   │   └── prompts.ts           # Prompt management
│   ├── services/                 # Backend services
│   │   └── database.ts          # SQLite database service
│   ├── middleware/               # Express middleware
│   │   ├── auth.ts              # JWT authentication middleware
│   │   └── errorHandler.ts     # Error handling middleware
│   └── index.ts                  # Express server entry point
├── data/                         # Database storage
├── prompts/                      # System prompt files
└── dist/                         # Built frontend files
```

## 🚀 **Getting Started**

### Prerequisites
- Node.js 18+ with npm
- Anthropic API key

### Installation

1. **Clone the repository:**
```bash
git clone https://github.com/discourse42/boba-chat.git
cd boba-chat
npm install
```

2. **Configure environment variables:**
```bash
# Copy the example environment file
cp .env.example .env

# Edit .env with your configuration
VITE_ANTHROPIC_API_KEY=your-anthropic-api-key-here
JWT_SECRET=your-secure-jwt-secret-here
PORT=3002
DEFAULT_PASSWORD=your-secure-password
```

3. **Start development server:**
```bash
# Start the test server (recommended)
node test-server.js

# Then start the frontend
npm run dev:client

# Or use the full TypeScript setup:
npm run dev  # Starts both frontend and backend
```

4. **Access the application:**
   - Open http://localhost:5173 in your browser
   - Login with username: `admin` and your configured password

### Production Deployment

1. **Build the application:**
```bash
npm run build
```

2. **Start the production server:**
```bash
npm start
```

## ✨ **Key Features**

- **Collapsible Sidebar**: Thin toggle on the border for easy show/hide
- **Real-time Streaming**: Watch responses appear in real-time
- **Session Management**: Persistent chat history with SQLite
- **JWT Authentication**: Secure token-based login
- **TypeScript**: Full type safety throughout
- **Modern React**: Context API, custom hooks, and clean architecture
- **Mobile Warning**: Tells users it's not mobile-ready (because it's not)
- **Session Viewer**: Standalone pages for viewing old conversations

## 🔧 **Configuration**

### Environment Variables
- `VITE_ANTHROPIC_API_KEY`: Your Anthropic API key (required)
- `JWT_SECRET`: Secret key for JWT signing (required)
- `PORT`: Server port (default: 3001)
- `NODE_ENV`: Environment mode (development/production)
- `DEFAULT_PASSWORD`: Default admin password (change immediately)

### System Prompts
Add `.md` files to the `prompts/` directory to create custom system prompts.

## 🛠️ **Development**

### Available Scripts
```bash
npm run dev          # Start both frontend and backend
npm run dev:client   # Start Vite dev server only
npm run dev:server   # Start Express server only
npm run build        # Build frontend for production
npm run start        # Build and start production server
npm run lint         # Run ESLint
```

### Database
The SQLite database is automatically created in the `data/` directory with the following tables:
- `users`: User accounts and authentication
- `sessions`: Chat sessions with metadata
- `messages`: Individual messages with content and timestamps

## 🔒 **Security Features**

- **JWT Authentication**: Secure token-based authentication
- **Password Hashing**: bcrypt with salt rounds
- **Rate Limiting**: Configurable API rate limits
- **Input Validation**: Server-side validation for all inputs
- **CSRF Protection**: Cross-site request forgery protection
- **Security Headers**: Helmet.js security middleware
- **SQL Injection Protection**: Parameterized queries

## 🤝 **Contributing**

This enhanced version maintains compatibility with the original while adding modern development practices:

- TypeScript for type safety
- React for component reusability
- Proper error handling and validation
- Modular architecture for maintainability
- Security best practices

## 📝 **License**

This project is provided as-is for educational and development purposes.