import streamlit as st
import requests
import sympy as sp

# Backend configuration
OLLAMA_URL = "http://ollama:11434/api/generate"
MODEL_NAME = "llama3"


def call_ollama(prompt: str) -> str:
    """
    Call the Ollama backend with a simple generate request.
    Returns the model's text response or a readable error message.
    """
    try:
        response = requests.post(
            OLLAMA_URL,
            json={
                "model": MODEL_NAME,
                "prompt": prompt,
                "stream": False,
            },
            timeout=120,
        )
        response.raise_for_status()
        data = response.json()
        return data.get("response", "").strip() or "[No response from model]"
    except Exception as e:
        return f"[Error contacting LLM backend: {e}]"


# === Math helper functions ===

_ALLOWED_EXPR_CHARS = set("0123456789+-*/(). ")


def is_plain_expression(text: str) -> bool:
    """
    Return True if text looks like a bare arithmetic expression (digits and +-*/(). only).
    """
    text = text.strip()
    if not text:
        return False
    return all(ch in _ALLOWED_EXPR_CHARS for ch in text)


def evaluate_expression(expr: str):
    """
    Safely evaluate a simple arithmetic expression using sympy.
    Returns (result, error_message). Only one of them will be non-None.
    """
    try:
        sym_expr = sp.sympify(expr)
        result = sym_expr.evalf()
        # If it's an integer, return as int
        if result == int(result):
            result = int(result)
        return result, None
    except Exception as e:
        return None, str(e)


def extract_expression_from_word_problem(problem: str) -> str:
    """
    Use the LLM to extract a single arithmetic expression from a word problem.
    The LLM is instructed to output ONLY the expression, which we then clean.
    """
    prompt = (
        "You will receive a math word problem.\n"
        "Your task is to extract a single arithmetic expression that represents the calculation "
        "needed to solve the problem.\n\n"
        "Rules:\n"
        "- Use only digits, +, -, *, / and parentheses.\n"
        "- Do NOT include any words or explanation.\n"
        "- If there are multiple steps, combine them into one expression.\n\n"
        "Example:\n"
        "Problem: Tom has 15 pencils. He buys 7 more and gives 3 away. How many pencils does he have now?\n"
        'Expression: 15 + 7 - 3\n\n'
        "Now extract the expression for this problem:\n\n"
        f"{problem.strip()}\n\n"
        "Expression:"
    )
    raw = call_ollama(prompt)
    # Take only the first line and filter allowed characters
    first_line = raw.strip().splitlines()[0]
    cleaned = "".join(ch for ch in first_line if ch in _ALLOWED_EXPR_CHARS)
    return cleaned.strip()


# Page config
st.set_page_config(
    page_title="Study Buddy – AI Assistant for Teachers",
    page_icon="📚",
    layout="wide",
)

# === Teacher Context Sidebar ===
st.sidebar.title("Teacher Context")

subject = st.sidebar.selectbox(
    "Subject",
    ["Mathematics", "Physics", "English", "History", "Other"],
    index=0,
)

level = st.sidebar.selectbox(
    "Level / Year",
    [
        "Lower Secondary",
        "Upper Secondary",
        "Year 7",
        "Year 8",
        "Year 9",
        "Year 10",
        "Year 11",
    ],
    index=5,  # e.g. default Year 10
)

topic = st.sidebar.text_input(
    "Today's topic",
    value="Quadratic equations",
)

user_type = st.sidebar.radio(
    "User type",
    ["Teacher (material generator)", "Student (study help)"],
    index=0,
)
# === End of Teacher Context Sidebar ===


# Main UI
st.title("📚 Study Buddy – AI Assistant for Teachers")
st.write(
    "Generate explanations, simplified notes, quizzes, and practice questions for your lessons. "
    "The tool uses a local LLM backend (Ollama) running in Docker."
)

tool = st.selectbox(
    "Choose a tool:",
    [
        "Explain & Clarify",
        "Simplify Notes",
        "Quick Quiz for Class",
        "Practice Questions",
        "Check a Math Problem",
    ],
)

st.markdown("---")

# === Tool 1: Explain & Clarify ===
if tool == "Explain & Clarify":
    st.header("Explain this concept to your class")

    q = st.text_area(
        "What do you want explained?",
        placeholder="Example: Solve quadratic equations by factorisation.",
    )

    if st.button("Generate explanation"):
        if q.strip():
            with st.spinner("Generating explanation..."):
                prompt = (
                    f"You are helping a {subject} teacher prepare a short explanation for {level} students.\n"
                    f"Today's lesson topic is: {topic}.\n\n"
                    "Write a clear explanation that the teacher can present in class. "
                    "Use language appropriate for the level, and include at least one simple example.\n\n"
                    "Teacher request:\n"
                    f"{q}"
                )
                answer = call_ollama(prompt)

            st.subheader("Classroom explanation")
            st.write(answer)
        else:
            st.warning("Please type what you want explained.")

# === Tool 2: Simplify Notes ===
elif tool == "Simplify Notes":
    st.header("Simplify teacher notes for students")

    text = st.text_area(
        "Paste your notes or textbook excerpt:",
        height=200,
        placeholder="Paste the material you want to simplify for your class.",
    )

    if st.button("Simplify notes"):
        if text.strip():
            with st.spinner("Simplifying notes..."):
                prompt = (
                    f"You are helping a {subject} teacher simplify notes for {level} students.\n"
                    f"The lesson topic is: {topic}.\n\n"
                    "Summarise and simplify the text below so that students can understand it easily. "
                    "Keep key ideas, definitions, and at least one example, but avoid unnecessary jargon.\n\n"
                    f"Notes:\n{text}"
                )
                summary = call_ollama(prompt)

            st.subheader("Student-friendly version")
            st.write(summary)
        else:
            st.warning("Please paste some text to simplify.")

# === Tool 3: Quick Quiz for Class ===
elif tool == "Quick Quiz for Class":
    st.header("Generate a quick multiple-choice quiz")

    material = st.text_area(
        "Paste study material to base the quiz on:",
        height=200,
        placeholder="Paste the passage, notes, or key points you want to turn into a quiz.",
    )
    num = st.slider("Number of questions:", 3, 15, 5)

    if st.button("Generate quiz"):
        if material.strip():
            with st.spinner("Generating quiz..."):
                prompt = (
                    f"You are a {subject} teacher preparing a short quiz for {level} students.\n"
                    f"Lesson topic: {topic}.\n\n"
                    f"Create {num} multiple-choice questions that check understanding of the main ideas. "
                    "Each question should have 4 options (A–D) and clearly mark the correct answer.\n\n"
                    "Base all questions on the material below.\n\n"
                    f"Material:\n{material}\n\n"
                    "Format:\n"
                    "1. Question text\n"
                    "A) ...\nB) ...\nC) ...\nD) ...\n"
                    "Correct answer: X\n\n"
                    "2. ..."
                )
                quiz = call_ollama(prompt)

            st.subheader("Quiz")
            st.write(quiz)
        else:
            st.warning("Please paste some material to generate a quiz from.")

# === Tool 4: Practice Questions ===
elif tool == "Practice Questions":
    st.header("Generate practice questions with answer key")

    material = st.text_area(
        "Paste material for practice questions:",
        height=200,
        placeholder=(
            "Paste the material you want to base the practice questions on "
            "(e.g. your notes or textbook section)."
        ),
    )
    num_q = st.slider("Number of questions:", 3, 15, 5)
    q_type = st.selectbox("Question type:", ["Short answer", "Mix"], index=0)

    if st.button("Create practice set"):
        if material.strip():
            with st.spinner("Generating practice questions..."):
                prompt = (
                    f"You are a {subject} teacher preparing practice questions for {level} students.\n"
                    f"Lesson topic: {topic}.\n\n"
                    f"Create {num_q} {q_type.lower()} questions for students to practise. "
                    "Base all questions on the material below. "
                    "After listing all questions, provide an answer key.\n\n"
                    "Format:\n"
                    "Questions:\n"
                    "1. ...\n2. ...\n\n"
                    "Answer key:\n"
                    "1) ...\n2) ...\n\n"
                    f"Material:\n{material}"
                )
                practice = call_ollama(prompt)

            st.subheader("Practice questions and answer key")
            st.write(practice)
        else:
            st.warning("Please paste some material to generate practice questions from.")

# === Tool 5: Check a Math Problem ===
elif tool == "Check a Math Problem":
    st.header("Check a math problem using Python")

    st.write(
        "Enter either a plain arithmetic expression (e.g. `15 + 7 - 3`) or a short word problem. "
        "The app will try to extract the underlying calculation and evaluate it using Python (SymPy)."
    )

    problem_text = st.text_area(
        "Math expression or word problem:",
        height=150,
        placeholder="Example: Tom has 15 pencils, adds 7 more and gives 3 away. How many does he have now?",
    )

    if st.button("Check answer"):
        problem_text = problem_text.strip()
        if not problem_text:
            st.warning("Please enter an expression or a word problem.")
        else:
            if is_plain_expression(problem_text):
                expr = problem_text
                st.info(f"Detected arithmetic expression: `{expr}`")
            else:
                with st.spinner("Extracting arithmetic expression from word problem..."):
                    expr = extract_expression_from_word_problem(problem_text)
                if not expr:
                    st.error("Could not extract a valid arithmetic expression from the problem.")
                    expr = None
                else:
                    st.info(f"Extracted arithmetic expression: `{expr}`")

            if expr:
                result, err = evaluate_expression(expr)
                if err is not None:
                    st.error(f"Error while evaluating expression: {err}")
                else:
                    st.success(f"Computed result: **{result}**")
