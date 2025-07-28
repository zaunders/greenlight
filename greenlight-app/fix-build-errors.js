const fs = require('fs');
const path = require('path');

// Files to fix
const files = [
  'src/app/active-lights/page.tsx',
  'src/app/auth/callback/page.tsx',
  'src/app/auth/reset-password/page.tsx',
  'src/app/mylights/[id]/edit/page.tsx',
  'src/app/mylights/[id]/page.tsx',
  'src/app/mylights/create/page.tsx',
  'src/app/mylights/page.tsx',
  'src/app/past-lights/page.tsx',
  'src/app/profile/edit/page.tsx',
  'src/app/users/[listId]/page.tsx',
  'src/app/users/add/page.tsx',
  'src/app/users/create-list/page.tsx',
  'src/app/users/page.tsx'
];

files.forEach(filePath => {
  const fullPath = path.join(__dirname, 'greenlight-app', filePath);
  
  if (!fs.existsSync(fullPath)) {
    console.log(`File not found: ${filePath}`);
    return;
  }
  
  let content = fs.readFileSync(fullPath, 'utf8');
  
  // Fix 1: Remove unused Image imports
  content = content.replace(/import Image from "next\/image";\n/g, '');
  
  // Fix 2: Replace any with unknown
  content = content.replace(/catch \(err: any\)/g, 'catch (err: unknown)');
  
  // Fix 3: Fix unescaped apostrophes
  content = content.replace(/You'll/g, "You&apos;ll");
  content = content.replace(/you'll/g, "you&apos;ll");
  content = content.replace(/You've/g, "You&apos;ve");
  content = content.replace(/you've/g, "you&apos;ve");
  content = content.replace(/Don't/g, "Don&apos;t");
  content = content.replace(/don't/g, "don&apos;t");
  content = content.replace(/I'm/g, "I&apos;m");
  content = content.replace(/i'm/g, "i&apos;m");
  content = content.replace(/It's/g, "It&apos;s");
  content = content.replace(/it's/g, "it&apos;s");
  content = content.replace(/We're/g, "We&apos;re");
  content = content.replace(/we're/g, "we&apos;re");
  content = content.replace(/They're/g, "They&apos;re");
  content = content.replace(/they're/g, "they&apos;re");
  content = content.replace(/That's/g, "That&apos;s");
  content = content.replace(/that's/g, "that&apos;s");
  content = content.replace(/There's/g, "There&apos;s");
  content = content.replace(/there's/g, "there&apos;s");
  content = content.replace(/Here's/g, "Here&apos;s");
  content = content.replace(/here's/g, "here&apos;s");
  content = content.replace(/Let's/g, "Let&apos;s");
  content = content.replace(/let's/g, "let&apos;s");
  content = content.replace(/Can't/g, "Can&apos;t");
  content = content.replace(/can't/g, "can&apos;t");
  content = content.replace(/Won't/g, "Won&apos;t");
  content = content.replace(/won't/g, "won&apos;t");
  content = content.replace(/Shouldn't/g, "Shouldn&apos;t");
  content = content.replace(/shouldn't/g, "shouldn&apos;t");
  content = content.replace(/Wouldn't/g, "Wouldn&apos;t");
  content = content.replace(/wouldn't/g, "wouldn&apos;t");
  content = content.replace(/Couldn't/g, "Couldn&apos;t");
  content = content.replace(/couldn't/g, "couldn&apos;t");
  content = content.replace(/Isn't/g, "Isn&apos;t");
  content = content.replace(/isn't/g, "isn&apos;t");
  content = content.replace(/Aren't/g, "Aren&apos;t");
  content = content.replace(/aren't/g, "aren&apos;t");
  content = content.replace(/Wasn't/g, "Wasn&apos;t");
  content = content.replace(/wasn't/g, "wasn&apos;t");
  content = content.replace(/Weren't/g, "Weren&apos;t");
  content = content.replace(/weren't/g, "weren&apos;t");
  content = content.replace(/Haven't/g, "Haven&apos;t");
  content = content.replace(/haven't/g, "haven&apos;t");
  content = content.replace(/Hasn't/g, "Hasn&apos;t");
  content = content.replace(/hasn't/g, "hasn&apos;t");
  content = content.replace(/Hadn't/g, "Hadn&apos;t");
  content = content.replace(/hadn't/g, "hadn&apos;t");
  content = content.replace(/Doesn't/g, "Doesn&apos;t");
  content = content.replace(/doesn't/g, "doesn&apos;t");
  content = content.replace(/Don't/g, "Don&apos;t");
  content = content.replace(/don't/g, "don&apos;t");
  content = content.replace(/Didn't/g, "Didn&apos;t");
  content = content.replace(/didn't/g, "didn&apos;t");
  
  // Fix 4: Comment out unused variables
  content = content.replace(/const searchParams = useSearchParams\(\);/g, '// const searchParams = useSearchParams(); // Unused for now');
  content = content.replace(/const \[success, setSuccess\] = useState<string \| null>\(null\);/g, '// const [success, setSuccess] = useState<string | null>(null); // Unused for now');
  content = content.replace(/const \[error, setError\] = useState<string \| null>\(null\);/g, '// const [error, setError] = useState<string | null>(null); // Unused for now');
  
  // Fix 5: Remove unused index parameter
  content = content.replace(/\(friend, index\) =>/g, '(friend) =>');
  
  fs.writeFileSync(fullPath, content);
  console.log(`Fixed: ${filePath}`);
});

console.log('Build error fixes applied!'); 