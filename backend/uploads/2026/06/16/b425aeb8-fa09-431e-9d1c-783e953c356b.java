package com.dreamsecurity.magicvkeypad.test;

import com.dreamsecurity.magicvkeypad.MagicKeypair;
import com.dreamsecurity.magicvkeypad.MagicVKeypadServer;

public class MagicVKeypadSample {

	public static void main(String[] args) {
								
			try {
				
			
				// init MagicVKeypad
				MagicVKeypadServer keypad = new MagicVKeypadServer();			
				
				// jcaos.lic 라이선스 파일의 경로를 설정한다. 
				//keypad.setLicensePath("./lib");
				
				// 아래 [방법 1], [방법 2] 중 선택하여 키쌍을 생성한다.
				// [주의] 키쌍은 매번 생성하지 않고 1번 생성한 후 고정하여 사용한다. (키쌍이 변경될 경우 변경된 키쌍으로 다시 암/복호화를 진행해야 한다.)

  
                // [방법 1]랜덤한 공개키, 개인키 키쌍을 파일 형태로 생성한다.
				//1-1. 설정한 경로에 설정한 파일명으로 공개키, 개인키 키쌍 파일을 생성한다.
				//keypad.generateKeypairFile("./",  "test", "1234");

				//1-2. 공개키, 개인키 파일의 경로를 설정하여 키쌍을 셋팅한다. 
				//keypad.setPrivateKeyFile("./test_pri.key", "1234");
				//keypad.setPublicKeyFile("./test_pub.key");
				
				// [방법 2] 랜덤한 공개키, 개인키 키쌍을 스트링 형태로 생성한다.
				// 2-1. 키쌍 스트링 생성  
				MagicKeypair magicKeypair = keypad.generateKeypairString("1234");

				// 2-2. 키쌍 스트링 셋팅
		        keypad.setBase64PrivateKey(magicKeypair.getPrivateKey(), "1234");
				keypad.setBase64PublicKey(magicKeypair.getPublicKey());
	
				// ============= 임시 ============
				// 복호화 테스트를 위하여 임시 키쌍 스트링 셋팅(클라이언트와 공유된 키쌍)
                // 사용자는 공개키, 개인키를 직접 생성한 후 고정하여 사용하여야 한다.
				keypad.setBase64PrivateKey("MIIFHjBIBgkqhkiG9w0BBQ0wOzAbBgkqhkiG9w0BBQwwDgQI4Ev8CX6wv04CAgQAMBwGCCqDGoyaRAEEBBBMULf/OpVj2j1jtQhKmA9CBIIE0JKoZ3EGSkdJ9PaW7t3W8GC9LRqd7nvUnIvDMaPCcB3WaraJZTNNHFd4V8taPuF/SH8lQ4fEuQ05NTtt++2ELz4xAxTO64cple5NBNEnMzmqQYSoyeb91LywjusLOLqmPqqCyn71xJo32vc1RdU2P+DiDWcPMb2R9zU18XrJnPfGpUlzmp4cRErbfpcqUh3wxyIaXSijQ5dyMTRa0/Xm8MIsrZMkypQCTMIH8BSzbUmwmVWzRuRjdETr+29qcLvBBcdGCXxbs2K4LyX50+e7sMIPN046k4GvjTYnQAD0nTIAaywn5i1gYR4k62gr4DODo65bDK1H5YEze0tXiFR5P/5t9sA+d77/PPad5/mpWQL0S/w4CzZpbdfkYDSFdxg5yQdeok3qzzKOIWsZoodIhC9vHflZodQnbaoykiHEgtj9UEC/Do3Ok2hKOGEMDwxrj5MitiNBo/mDSItN1FkowVMqN67yYit/NnAOI7mHZQJkI4Ulr4ZuLwrloHB2Mp5CByPy4xrGQ7AJlRdVEnzvzdAXtbiasNM38+YrkLHuuW9HrzwPhtvOomrIH2VtjBgB3eh/8iONoR0ImPU1mJMJYawc68SHcL1NM60FeTD4fCggdLuOPYmoiXkKFfNkWaVZVzFMnrLXQSCquH33fh6aLL9nRfotjznVtnXc7OMG1IeTj7lzXYzdZhU8ekhAh8VfoF17fzqb/+8Q2Y7CVH3tLTFaZyJ13KxihHeIxN5gYyifrdR6cRpW9e+HksK5KLU2qdtc8ZunupRxdF4V9yvjjdLIKHvnEuclGiFP7sVfmUbLfIf3cSdl3YgTJIPFeDWtKmYx+u1Z+ZPnXM9jt8SKruaPlo4NcsN5uOTV04dhTZVMTmK3nAupw5piA7zv7oxk+BzfF4VsdDddVwpr1PIsGemgwMefxeJ0ueEaVgNX/geNmh+sft7aRYGPcTs0Xa25KBqWfgph9opjDzOQH5RU9yZLIfxfm7sVJN97UcLbg4peModpgVNROmMdeWYa/4SFZaWPJvjwph5MaGOq50vACM24eOcyABpvc3/2C3/dmGevdyD8+jD6YYbDzY5RfWUSQAFlpK1fWoVNn2n05tRQW7/+XGhKtkXvPQa0ahrvEr3kL5OXNHKx1suI8DCLrqVqTptjHAQKA8eXf24inDepXgEy4NoUOn8QlQblb2rxzeCFPV+b3rdVp/V8maYVVshTh+JkbYhlYo1uzXj7i1CtbRM6kHNOIcB+8NX7RBMgtBxdrD83wIOqqtluGUupWMPVgSFTn5WBLIeaRnLVwjOzdT/nCjrH2LU2f4Fe4gzmz7Fbh/JeUKjYa2+0Ht4/Cbxf3KyZW7ZljQDcl/E5Lkm2uCS4ZfN5aGWLzhJm1svXL8fvmAFyRXdX4ztYtTxXmJ3JjtJlpHXfoS2mSwcfJ1NS5GWENLPwyOKaXeVBKeKjY0wpSMk5w9V7a6GA3+tIBWtWlEI3bs8jEe+XGT68FuIu65p/YmKBRlR4BdWKn+xWum5w/mF/GKZLXYn8qTUM5+ZjVDxnaehFqjI9kTUkq7AAsSnnUdSv87nFt2m6C+rgzpHgv0MJDbxFfPPNvlmrYl87R545tIqqXnadxXgJjXnEcv+ryW6bvhVLjaTjnjozDCJj", "1234");
				keypad.setBase64PublicKey("MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAgXC3C/uZ6naR3xGB5wIu8eW0UHz1embCT4RLZc+/xwdAqy18vdjr7YhQA7eVMiSU4X/Q505Z0TC596mGsQgrjtVPrUvQVei3Zq/N/Lvqzvz+580TfNuhQr4TNZBIUs1GfYCrY1JqtRGsy+O3tixTju7Y50CjMUIJ/WhqtvkSUv5V7tmU+3B01nqMDoqoOqj9EBVKgLQojj1Y9mWt4oytl2o0xKGGO7jAQvHcGf6JIIZl1HwUtYJ32L55WB2DLU91BWeenhJGpOi0xUDTRwb/AHmZBiZtdYZFYgN68t0/D3jF/0Vvdpov4OKKDGii/gyY+2TF07o3R+6sloHr9bMOIwIDAQAB");
		

                 // [암호화 데이터 설정] 
                 // 위에서 생성한 공개키를 이용하여 클라이언트에서 암호화 한 데이터 
				String b64EncKeypadPlain = "Vns1o1TKSV9tvzC5+V8zcLglfsQqZKHoWrQkB1T1GZZt7+iVe0EMlDUti+w8gdP/+rJwKOaVj8XVemEqH8FefB75qdqhv7MSLwxr4voUAEdefJ+9im47I9fbH/Zo0D+VCJSuckszr1HY1HXo0XLtuOrEw8CbRScjBf9dbCGYXS47W2XcRf/wBQW/11wegIS6wSUbVDuYQsWej5F4J7L75kE9C4dOqIUz/4NF8eXmZB74cjq2EXrmqllBpA4F/+yuudLymcKz46oatjHu+CbRsTqGf8yVpxTRC8scLymCv1Vq8zwnNIQZ4dynotrdVRDWpJ/ZPqJG+OBM2NcnCZGVtw==";
				


				// [복호화] E2E 암호화 된 데이터를 복호화 한다. 
				System.out.println("\n\n--- MagicKeypad KDF Record Test ---");
				String plainKeypadKDF = keypad.decryptMagicVKeypadRecord(b64EncKeypadPlain.getBytes());
				System.out.println("Magic VKeypad PIN = " + plainKeypadKDF);
		        
		
			} catch (Exception e) {
				e.printStackTrace();
			}
	}
	
}
