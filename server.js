const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware otimizado
app.use(cors({
    origin: process.env.NODE_ENV === 'production' ? 
        ['https://yourdomain.com'] : // substitua pelo seu domínio
        ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: true
}));

// Limite reduzido para melhor performance
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// Cache de arquivos estáticos
app.use(express.static(path.join(__dirname, 'public'), {
    maxAge: '1d', // Cache por 1 dia
    etag: true
}));

// Configuração otimizada do MongoDB
const mongoConfig = {
    maxPoolSize: 10, // Limite de conexões
    serverSelectionTimeoutMS: 5000, // Timeout reduzido
    socketTimeoutMS: 45000,
    bufferCommands: false,
    bufferMaxEntries: 0
};

mongoose.connect(process.env.MONGODB_URI, mongoConfig)
    .then(() => console.log('✅ Conectado ao MongoDB Atlas'))
    .catch(err => console.error('❌ Erro ao conectar ao MongoDB:', err));

// Schema otimizado com índices
const bookSchema = new mongoose.Schema({
    title: {
        type: String,
        default: "Nossa História",
        maxlength: 100
    },
    coverPhoto: {
        type: String,
        maxlength: 500000 // Limite para base64
    },
    coverPhotoType: {
        type: String,
        enum: ['image', 'video'],
        default: 'image'
    },
    coverText: {
        type: String,
        default: "Uma jornada de amor e momentos especiais...",
        maxlength: 500
    },
    coverStyle: {
        titleColor: { type: String, default: '#FFD700' },
        textColor: { type: String, default: '#FFD700' },
        background: { type: String, default: 'classic' },
        titleSize: { type: Number, default: 2.8, min: 1, max: 5 }
    },
    pages: [{
        elements: [{
            type: {
                type: String,
                enum: ['text', 'image', 'video'],
                required: true
            },
            content: { type: String, maxlength: 5000 },
            src: { type: String, maxlength: 500000 },
            alt: { type: String, maxlength: 200 },
            x: { type: Number, required: true, min: 0 },
            y: { type: Number, required: true, min: 0 },
            width: { type: Number, required: true, min: 10 },
            height: { type: Number, required: true, min: 10 },
            fontSize: { type: Number, min: 8, max: 72 },
            color: String
        }]
    }],
    userId: {
        type: String,
        required: true,
        default: 'default-user',
        index: true // Índice para busca rápida
    },
    version: {
        type: Number,
        default: 1
    }
}, {
    timestamps: true
});

// Índices para performance
bookSchema.index({ userId: 1 });
bookSchema.index({ updatedAt: -1 });

const Book = mongoose.model('Book', bookSchema);

// Cache em memória simples
const cache = new Map();
const CACHE_TTL = 30 * 1000; // 30 segundos

function setCache(key, value) {
    cache.set(key, {
        data: value,
        timestamp: Date.now()
    });
}

function getCache(key) {
    const cached = cache.get(key);
    if (cached && (Date.now() - cached.timestamp) < CACHE_TTL) {
        return cached.data;
    }
    cache.delete(key);
    return null;
}

// Middleware de rate limiting simples
const requestCounts = new Map();
function rateLimit(req, res, next) {
    const ip = req.ip || req.connection.remoteAddress;
    const now = Date.now();
    const windowMs = 60 * 1000; // 1 minuto
    const maxRequests = 60; // 60 requests por minuto
    
    if (!requestCounts.has(ip)) {
        requestCounts.set(ip, []);
    }
    
    const requests = requestCounts.get(ip);
    const validRequests = requests.filter(time => now - time < windowMs);
    
    if (validRequests.length >= maxRequests) {
        return res.status(429).json({ error: 'Muitas requisições. Tente novamente em 1 minuto.' });
    }
    
    validRequests.push(now);
    requestCounts.set(ip, validRequests);
    next();
}

// Aplicar rate limiting apenas nas rotas da API
app.use('/api', rateLimit);

// ROTAS OTIMIZADAS

// Buscar livro com cache
app.get('/api/book/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const cacheKey = `book_${userId}`;
        
        // Verificar cache primeiro
        const cached = getCache(cacheKey);
        if (cached) {
            return res.json(cached);
        }
        
        let book = await Book.findOne({ userId }).lean(); // .lean() para melhor performance
        
        if (!book) {
            // Criar livro padrão otimizado
            book = {
                userId,
                title: "Nossa História",
                coverText: "Uma jornada de amor e momentos especiais...",
                coverStyle: {
                    titleColor: '#FFD700',
                    textColor: '#FFD700',
                    background: 'classic',
                    titleSize: 2.8
                },
                pages: [{
                    elements: [{
                        type: 'text',
                        content: 'Era uma vez...',
                        x: 50,
                        y: 100,
                        width: 300,
                        height: 100,
                        fontSize: 16,
                        color: '#333'
                    }]
                }],
                version: 1
            };
            
            const newBook = new Book(book);
            await newBook.save();
            book = newBook.toObject();
        }
        
        // Armazenar no cache
        setCache(cacheKey, book);
        
        res.json(book);
    } catch (error) {
        console.error('❌ Erro ao buscar livro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Salvar com debounce e validação
app.post('/api/book/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        const bookData = req.body;
        
        // Validações básicas
        if (!bookData || typeof bookData !== 'object') {
            return res.status(400).json({ error: 'Dados inválidos' });
        }
        
        // Limitar tamanho dos dados
        const dataSize = JSON.stringify(bookData).length;
        if (dataSize > 5 * 1024 * 1024) { // 5MB
            return res.status(413).json({ error: 'Dados muito grandes. Limite: 5MB' });
        }
        
        bookData.userId = userId;
        bookData.version = (bookData.version || 0) + 1;
        
        // Usar upsert para melhor performance
        const book = await Book.findOneAndUpdate(
            { userId },
            bookData,
            { 
                new: true, 
                upsert: true,
                lean: true
            }
        );
        
        // Limpar cache
        cache.delete(`book_${userId}`);
        
        res.json({ message: 'Livro salvo com sucesso', book });
    } catch (error) {
        console.error('❌ Erro ao salvar livro:', error);
        
        if (error.name === 'ValidationError') {
            return res.status(400).json({ error: 'Dados inválidos', details: error.message });
        }
        
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Rota para salvar apenas uma página (otimização)
app.patch('/api/book/:userId/page/:pageIndex', async (req, res) => {
    try {
        const { userId, pageIndex } = req.params;
        const pageData = req.body;
        
        const book = await Book.findOne({ userId });
        if (!book) {
            return res.status(404).json({ error: 'Livro não encontrado' });
        }
        
        const index = parseInt(pageIndex);
        if (index >= 0 && index < book.pages.length) {
            book.pages[index] = pageData;
        } else {
            book.pages.push(pageData);
        }
        
        book.version += 1;
        await book.save();
        
        // Limpar cache
        cache.delete(`book_${userId}`);
        
        res.json({ message: 'Página salva com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao salvar página:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Deletar livro
app.delete('/api/book/:userId', async (req, res) => {
    try {
        const userId = req.params.userId;
        await Book.findOneAndDelete({ userId });
        
        // Limpar cache
        cache.delete(`book_${userId}`);
        
        res.json({ message: 'Livro deletado com sucesso' });
    } catch (error) {
        console.error('❌ Erro ao deletar livro:', error);
        res.status(500).json({ error: 'Erro interno do servidor' });
    }
});

// Health check
app.get('/health', (req, res) => {
    res.json({ 
        status: 'ok', 
        timestamp: new Date().toISOString(),
        uptime: process.uptime()
    });
});

// Rota principal
app.get('/', (req, res) => {
    res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Middleware de erro global
app.use((error, req, res, next) => {
    console.error('❌ Erro não tratado:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
});

// Limpeza periódica do cache
setInterval(() => {
    const now = Date.now();
    for (const [key, value] of cache.entries()) {
        if (now - value.timestamp > CACHE_TTL) {
            cache.delete(key);
        }
    }
}, CACHE_TTL);

// Graceful shutdown
process.on('SIGTERM', async () => {
    console.log('🔄 Recebido SIGTERM, fechando servidor...');
    await mongoose.connection.close();
    process.exit(0);
});

// Iniciar servidor
app.listen(PORT, () => {
    console.log(`🚀 Servidor rodando na porta ${PORT}`);
    console.log(`📊 Ambiente: ${process.env.NODE_ENV || 'development'}`);
});
