from pathlib import Path
text = Path('src/pages/Transactions.tsx').read_text(encoding='utf-8', errors='ignore')
print('contains string', 'payment_method' in text)
print(text[:500])
