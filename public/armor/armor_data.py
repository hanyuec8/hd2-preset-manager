import json
import os
import time
from multiprocessing import Pool
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.chrome.service import Service
from selenium.webdriver.support.ui import WebDriverWait
from selenium.webdriver.support import expected_conditions as EC
from webdriver_manager.chrome import ChromeDriverManager

def scrape_armor(target):
    armor_type = target['type']
    url = target['url']
    section_id = target['id']
    
    options = webdriver.ChromeOptions()
    options.add_argument('--headless')
    options.add_argument('--disable-gpu')
    options.add_argument('--no-sandbox')
    options.add_argument('--disable-dev-shm-usage')
    options.add_argument('--window-size=1920,1080') # 충분한 해상도 설정
    options.add_argument('--disable-blink-features=AutomationControlled')
    options.add_argument("user-agent=Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/146.0.0.0 Safari/537.36")
    
    driver = webdriver.Chrome(service=Service(ChromeDriverManager().install()), options=options)
    results = []
    
    try:
        print(f"[{armor_type}] 페이지 접속 중...")
        driver.get(url)
        wait = WebDriverWait(driver, 25) # 대기 시간 상향
        
        # 1. 섹션 ID(span)가 나타날 때까지 대기
        target_span = wait.until(EC.presence_of_element_located((By.ID, section_id)))
        
        # 2. 브라우저가 요소를 인식하도록 해당 위치로 스크롤
        driver.execute_script("arguments[0].scrollIntoView();", target_span)
        time.sleep(1) # 렌더링 시간 확보

        # 3. 테이블 탐색 (ID 바로 뒤가 아니라, 문서 전체에서 해당 ID 이후의 첫 wikitable 검색)
        # CSS Selector가 XPath보다 안정적일 때가 많습니다.
        # #ID 요소의 조상인 h2/h3의 다음 형제들 중 table을 찾습니다.
        table_selector = f"h2:has(#{section_id}) + table, h3:has(#{section_id}) + table, #{section_id} ~ table, .wikitable"
        
        # 위키 구조상 ID 기반 탐색이 실패할 경우를 대비해 순서로도 접근
        tables = driver.find_elements(By.CSS_SELECTOR, "table.wikitable")
        
        if armor_type == "Light": target_table = tables[0]
        elif armor_type == "Medium": target_table = tables[1]
        else: target_table = tables[2] # Heavy

        rows = target_table.find_elements(By.CSS_SELECTOR, "tbody tr")
        
        for row in rows:
            cells = row.find_elements(By.TAG_NAME, "td")
            # 이름(2번째)과 패시브(6번째) 열 추출
            if len(cells) >= 6:
                name = cells[1].text.strip()
                passive = cells[5].text.strip()
                if name:
                    results.append({
                        "type": armor_type,
                        "name": name,
                        "passive_effect": passive
                    })
        
        print(f"[{armor_type}] 수집 완료: {len(results)}건")
        
    except Exception as e:
        print(f"[{armor_type}] 에러 발생: {type(e).__name__}")
    finally:
        driver.quit()
        
    return results

if __name__ == "__main__":
    FILE_PATH = 'helldivers2_all_armors.json'
    
    # 기존 데이터 로드 로직
    all_data = []
    if os.path.exists(FILE_PATH):
        try:
            with open(FILE_PATH, 'r', encoding='utf-8') as f:
                all_data = json.load(f)
            print(f"기존 데이터 로드 완료: {len(all_data)}개")
        except:
            print("기존 파일이 손상되어 새로 시작합니다.")
            all_data = []
    else:
        print("기존 파일이 없어 새로 생성합니다.")
    
    existing_names = {item['name'] for item in all_data}

    targets = [
        {"type": "Light", "url": "https://helldivers.wiki.gg/wiki/Armor#Light-0", "id": "Light-0"},
        {"type": "Medium", "url": "https://helldivers.wiki.gg/wiki/Armor#Medium-0", "id": "Medium-0"},
        {"type": "Heavy", "url": "https://helldivers.wiki.gg/wiki/Armor#Heavy-0", "id": "Heavy-0"}
    ]

    print("멀티프로세싱 시작 (3개 채널)...")
    with Pool(processes=3) as pool:
        pool_results = pool.map(scrape_armor, targets)

    # 결과 병합 (중복 제외)
    added_count = 0
    for category_results in pool_results:
        for item in category_results:
            if item['name'] not in existing_names:
                all_data.append(item)
                existing_names.add(item['name'])
                added_count += 1

    # 파일 저장
    with open(FILE_PATH, 'w', encoding='utf-8') as f:
        json.dump(all_data, f, ensure_ascii=False, indent=4)

    print("\n" + "="*50)
    print(f"최종 결과: 신규 {added_count}개 추가")
    print(f"전체 데이터 개수: {len(all_data)}개")
    print("="*50)