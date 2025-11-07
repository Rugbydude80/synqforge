#!/usr/bin/env python3
"""
Quick test script to verify the setup is working.
"""

import sys
from pathlib import Path

def check_setup():
    """Check if all required dependencies and files are present."""
    print("Checking Smart Context test suite setup...")
    print("")
    
    # Check Python version
    if sys.version_info < (3, 8):
        print("❌ Python 3.8+ required")
        return False
    print(f"✅ Python {sys.version_info.major}.{sys.version_info.minor}")
    
    # Check required files
    required_files = [
        'similarity.py',
        'generation.py',
        'metrics.py',
        'test_suite.py',
        'run_tests.py',
        'sample_epic_stories.py',
        'requirements.txt'
    ]
    
    base_dir = Path(__file__).parent
    for file in required_files:
        if (base_dir / file).exists():
            print(f"✅ {file}")
        else:
            print(f"❌ {file} not found")
            return False
    
    # Check dependencies
    print("\nChecking dependencies...")
    try:
        import sentence_transformers
        print("✅ sentence-transformers")
    except ImportError:
        print("❌ sentence-transformers not installed")
        print("   Run: pip install -r requirements.txt")
        return False
    
    try:
        import numpy
        print("✅ numpy")
    except ImportError:
        print("❌ numpy not installed")
        return False
    
    try:
        import sklearn
        print("✅ scikit-learn")
    except ImportError:
        print("❌ scikit-learn not installed")
        return False
    
    try:
        from dotenv import load_dotenv
        print("✅ python-dotenv")
    except ImportError:
        print("❌ python-dotenv not installed")
        return False
    
    # Check API keys
    print("\nChecking API configuration...")
    from dotenv import load_dotenv
    import os
    load_dotenv()
    
    has_openrouter = bool(os.getenv('OPENROUTER_API_KEY'))
    
    if has_openrouter:
        print("✅ OPENROUTER_API_KEY found")
        model = os.getenv('OPENROUTER_MODEL', 'qwen/qwen3-max')
        print(f"   Model: {model}")
    else:
        print("⚠️  OPENROUTER_API_KEY not found in .env file")
        print("   Create .env file from .env.example and add your OpenRouter API key")
        print("   Get your key from https://openrouter.ai/")
        return False
    
    print("\n✅ Setup check complete! Ready to run tests.")
    print("   Run: python run_tests.py")
    return True

if __name__ == '__main__':
    success = check_setup()
    sys.exit(0 if success else 1)

