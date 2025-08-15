const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');
const path = require('path');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));

// Servir arquivos estáticos
app.use(express.static(path.join(__dirname, 'public')));

// Conectar ao MongoDB
mongoose.connect(process.env.MONGODB_URI)
  .then(() => console.log('Conectado ao MongoDB Atlas'))
  .catch(err => console.error('Erro ao conectar ao MongoDB:', err));

// Schema do livro
const bookSchema = new mongoose.Schema({
  title: {
    type: String,
    default: "Nossa História"
  },
  coverPhoto: String,
  coverPhotoType: {
    type: String,
    enum: ['image', 'video'],
    default: 'image'
  },
  coverText: {
    type: String,
    default: "Uma jornada de amor e momentos especiais..."
  },
  coverStyle: {
    titleColor: {
      type: String,
      default: '#FFD700'
    },
    textColor: {
      type: String,
      default: '#FFD700'
    },
    background: {
      type: String,
      default: 'classic'
    },
    titleSize: {
      type: Number,
      default: 2.8
    }
  },
  pages: [{
    elements: [{
      type: {
        type: String,
        enum: ['text', 'image', 'video'],
        required: true
      },
      content: String, // Para texto
      src: String,     // Para imagem/vídeo
      alt: String,     // Para imagem
      x: {
        type: Number,
        required: true
      },
      y: {
        type: Number,
        required: true
      },
      width: {
        type: Number,
        required: true
      },
      height: {
        type: Number,
        required: true
      },
      fontSize: Number, // Para texto
      color: String     // Para texto
    }]
  }],
  userId: {
    type: String,
    required: true,
    default: 'default-user'
  }
}, {
  timestamps: true
});

const Book = mongoose.model('Book', bookSchema);

// Rotas da API

// Buscar livro do usuário
app.get('/api/book/:userId', async (req, res) => {
  try {
    let book = await Book.findOne({ userId: req.params.userId });
    
    // Se não existe, criar um livro padrão
    if (!book) {
      book = new Book({
        userId: req.params.userId,
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
        }]
      });
      await book.save();
    }
    
    res.json(book);
  } catch (error) {
    console.error('Erro ao buscar livro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Salvar/atualizar livro
app.post('/api/book/:userId', async (req, res) => {
  try {
    const bookData = req.body;
    bookData.userId = req.params.userId;
    
    let book = await Book.findOne({ userId: req.params.userId });
    
    if (book) {
      // Atualizar livro existente
      Object.assign(book, bookData);
      await book.save();
    } else {
      // Criar novo livro
      book = new Book(bookData);
      await book.save();
    }
    
    res.json({ message: 'Livro salvo com sucesso', book });
  } catch (error) {
    console.error('Erro ao salvar livro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Deletar livro
app.delete('/api/book/:userId', async (req, res) => {
  try {
    await Book.findOneAndDelete({ userId: req.params.userId });
    res.json({ message: 'Livro deletado com sucesso' });
  } catch (error) {
    console.error('Erro ao deletar livro:', error);
    res.status(500).json({ error: 'Erro interno do servidor' });
  }
});

// Rota para servir o index.html na raiz
app.get('/', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

// Iniciar servidor
app.listen(PORT, () => {
  console.log(`Servidor rodando na porta ${PORT}`);
});