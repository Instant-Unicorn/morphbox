# MorphBox Tutorials

Learn how to use MorphBox effectively with these hands-on tutorials. Each tutorial builds on the previous one, teaching you different aspects of AI-assisted development.

## Table of Contents

1. [Tutorial 1: Your First MorphBox Session](#tutorial-1-your-first-morphbox-session)
2. [Tutorial 2: Building a Full-Stack Web App](#tutorial-2-building-a-full-stack-web-app)
3. [Tutorial 3: Data Analysis with Python](#tutorial-3-data-analysis-with-python)
4. [Tutorial 4: API Development and Testing](#tutorial-4-api-development-and-testing)
5. [Tutorial 5: Test-Driven Development](#tutorial-5-test-driven-development)
6. [Tutorial 6: Debugging and Code Review](#tutorial-6-debugging-and-code-review)
7. [Tutorial 7: Learning a New Language](#tutorial-7-learning-a-new-language)

---

## Tutorial 1: Your First MorphBox Session

**Goal**: Create a simple command-line application with Claude's help.

**Time**: 15 minutes

### Setup

1. Create a new directory and start MorphBox:
   ```bash
   mkdir todo-cli
   cd todo-cli
   morphbox
   ```

2. Wait for the web interface to open at `http://localhost:3000`

### Steps

1. **In the Claude panel, type:**
   ```
   Help me create a Python command-line todo list application with the following features:
   - Add tasks
   - Mark tasks as complete
   - List all tasks
   - Save tasks to a JSON file
   - Load tasks on startup
   ```

2. **Claude will create the application. Next, ask:**
   ```
   Now add color output using colorama and create a README with usage examples
   ```

3. **In the terminal panel, test your application:**
   ```bash
   # Install dependencies
   pip install colorama
   
   # Run the app
   python todo.py add "Learn MorphBox"
   python todo.py add "Build something cool"
   python todo.py list
   python todo.py complete 1
   python todo.py list
   ```

4. **Enhance it further:**
   ```
   Add the ability to set priority levels (high, medium, low) and due dates
   ```

### What You'll Learn

- How to interact with Claude effectively
- Iterative development workflow
- Testing code in the isolated environment
- Managing dependencies

---

## Tutorial 2: Building a Full-Stack Web App

**Goal**: Create a complete web application with frontend and backend.

**Time**: 30 minutes

### Setup

```bash
mkdir recipe-app
cd recipe-app
morphbox
```

### Part 1: Backend API

1. **Ask Claude:**
   ```
   Create a Node.js Express API for a recipe management app with:
   - CRUD operations for recipes
   - SQLite database using better-sqlite3
   - Input validation
   - Error handling
   ```

2. **Set up the backend:**
   ```bash
   # In terminal panel
   npm init -y
   npm install express better-sqlite3 cors
   npm install -D nodemon
   
   # Run the server
   npx nodemon server.js
   ```

### Part 2: Frontend

3. **Ask Claude:**
   ```
   Create a modern, responsive frontend for the recipe API using:
   - Vanilla JavaScript (no framework)
   - Fetch API for backend communication
   - CSS Grid and Flexbox for layout
   - A form to add new recipes
   - Cards to display recipes
   ```

4. **Test the application:**
   ```bash
   # In a new terminal (click + in terminal panel)
   python -m http.server 8080
   ```

5. **Open `http://localhost:8080` in your browser**

### Part 3: Enhancement

6. **Ask Claude:**
   ```
   Add these features:
   - Search functionality
   - Filter by category
   - Recipe rating system
   - Local storage for favorites
   ```

### What You'll Learn

- Full-stack development workflow
- API design and implementation
- Frontend-backend communication
- Database integration
- Progressive enhancement

---

## Tutorial 3: Data Analysis with Python

**Goal**: Analyze data and create visualizations with Claude's guidance.

**Time**: 25 minutes

### Setup

```bash
mkdir data-analysis
cd data-analysis
morphbox
```

### Steps

1. **Ask Claude:**
   ```
   Help me create a Python data analysis project that:
   - Generates sample sales data (CSV)
   - Loads and cleans the data with pandas
   - Performs analysis (trends, top products, etc.)
   - Creates visualizations with matplotlib
   - Generates a PDF report
   ```

2. **Install dependencies:**
   ```bash
   pip install pandas matplotlib seaborn jupyter reportlab
   ```

3. **Run the analysis:**
   ```bash
   python generate_data.py
   python analyze.py
   ```

4. **Create an interactive notebook:**
   ```
   Convert the analysis to a Jupyter notebook with step-by-step explanations
   ```

5. **Start Jupyter:**
   ```bash
   jupyter notebook --ip=0.0.0.0 --port=8888 --no-browser
   ```

### What You'll Learn

- Data manipulation with pandas
- Creating visualizations
- Working with Jupyter notebooks
- Generating reports
- Statistical analysis

---

## Tutorial 4: API Development and Testing

**Goal**: Build a RESTful API with comprehensive testing.

**Time**: 30 minutes

### Setup

```bash
mkdir user-api
cd user-api
morphbox
```

### Part 1: API Development

1. **Ask Claude:**
   ```
   Create a Node.js REST API for user management with:
   - User registration and login
   - JWT authentication
   - Password hashing with bcrypt
   - Input validation with Joi
   - MongoDB with Mongoose
   ```

2. **Set up MongoDB:**
   ```bash
   # Claude will guide you to use MongoDB Atlas or a local instance
   npm install express mongoose bcrypt jsonwebtoken joi dotenv
   ```

### Part 2: Testing

3. **Ask Claude:**
   ```
   Create comprehensive tests using Jest and Supertest:
   - Unit tests for all functions
   - Integration tests for API endpoints
   - Test database setup and teardown
   - Coverage reporting
   ```

4. **Run tests:**
   ```bash
   npm install -D jest supertest @types/jest
   npm test
   npm run test:coverage
   ```

### Part 3: Documentation

5. **Ask Claude:**
   ```
   Generate API documentation using Swagger/OpenAPI
   ```

6. **View documentation:**
   ```bash
   npm install swagger-ui-express swagger-jsdoc
   node server.js
   # Open http://localhost:3000/api-docs
   ```

### What You'll Learn

- RESTful API design
- Authentication and security
- Testing strategies
- API documentation
- Database operations

---

## Tutorial 5: Test-Driven Development

**Goal**: Learn TDD by building a feature from tests first.

**Time**: 20 minutes

### Setup

```bash
mkdir tdd-calculator
cd tdd-calculator
morphbox
```

### Steps

1. **Ask Claude:**
   ```
   Guide me through TDD by building a scientific calculator in Python:
   1. Write tests first
   2. Make them fail
   3. Implement minimum code to pass
   4. Refactor
   ```

2. **Follow the TDD cycle:**
   ```bash
   # Run tests (they should fail initially)
   python -m pytest tests/ -v
   
   # Implement features
   # Run tests again (they should pass)
   python -m pytest tests/ -v
   ```

3. **Add more features using TDD:**
   ```
   Using TDD, add:
   - Memory functions (M+, M-, MR, MC)
   - History of calculations
   - Expression parsing (e.g., "2 + 3 * 4")
   ```

### What You'll Learn

- Test-Driven Development methodology
- Writing effective tests
- Red-Green-Refactor cycle
- Test coverage
- Mocking and fixtures

---

## Tutorial 6: Debugging and Code Review

**Goal**: Learn debugging techniques and code improvement strategies.

**Time**: 20 minutes

### Setup

```bash
mkdir debug-practice
cd debug-practice
morphbox
```

### Part 1: Debugging

1. **Ask Claude:**
   ```
   Create a Node.js application with intentional bugs:
   - Memory leak
   - Race condition
   - Undefined variable access
   - Infinite loop
   - SQL injection vulnerability
   
   Then guide me through finding and fixing each one
   ```

2. **Use debugging tools:**
   ```bash
   # Run with Node debugger
   node --inspect server.js
   
   # Use Chrome DevTools for debugging
   ```

### Part 2: Code Review

3. **Provide code for review:**
   ```
   Review this code and suggest improvements:
   [Paste any of your existing code]
   
   Focus on:
   - Performance
   - Security
   - Readability
   - Best practices
   ```

### What You'll Learn

- Debugging techniques
- Using debugging tools
- Identifying common bugs
- Code review best practices
- Performance optimization

---

## Tutorial 7: Learning a New Language

**Goal**: Learn Go/Rust/another language with Claude as your tutor.

**Time**: 30 minutes

### Setup

```bash
mkdir learn-rust
cd learn-rust
morphbox
```

### Steps

1. **Start with basics:**
   ```
   I want to learn Rust. Start with:
   - Basic syntax and concepts
   - Ownership and borrowing
   - Simple examples I can run
   ```

2. **Build a project:**
   ```
   Help me build a CLI file organizer in Rust that:
   - Scans a directory
   - Organizes files by type
   - Has a dry-run mode
   - Shows progress
   ```

3. **Install Rust (if not present):**
   ```bash
   curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
   source $HOME/.cargo/env
   ```

4. **Build and run:**
   ```bash
   cargo init
   cargo build
   cargo run -- --help
   ```

5. **Learn advanced concepts:**
   ```
   Explain and show examples of:
   - Traits and generics
   - Error handling with Result
   - Async programming
   - Testing in Rust
   ```

### What You'll Learn

- New programming language fundamentals
- Language-specific paradigms
- Package management
- Building real projects while learning
- Comparing languages

---

## Tips for Effective Tutorial Learning

### 1. Ask Follow-up Questions
Don't hesitate to ask Claude to:
- Explain concepts in more detail
- Provide alternative solutions
- Show best practices
- Add more features

### 2. Experiment and Break Things
- Modify the code Claude provides
- Try to break it and understand why
- Ask Claude to help fix your modifications

### 3. Build on Tutorials
- Combine concepts from multiple tutorials
- Create your own variations
- Share your creations with the community

### 4. Use the Prompt Queue
For complex projects:
1. Plan your questions in advance
2. Add them to the prompt queue
3. Let Claude work through them systematically

### 5. Save Your Work
```bash
# Initialize git in your project
git init
git add .
git commit -m "Initial commit"

# Create a GitHub repo and push
```

## Next Steps

After completing these tutorials:

1. **Try the Use Cases** - Apply your skills to real-world scenarios
2. **Build Your Own Project** - Start something from scratch
3. **Contribute** - Share your own tutorials with the community
4. **Explore Advanced Features** - Learn about custom configurations

## Getting Help

- If you get stuck, ask Claude to explain differently
- Check the [Troubleshooting Guide](TROUBLESHOOTING.md)
- Join the [GitHub Discussions](https://github.com/MicahBly/morphbox/discussions)

---

**Remember**: The best way to learn is by doing. Start with Tutorial 1 and work your way through. Each tutorial builds your skills and confidence with AI-assisted development. Happy learning! 🎓