const masterFoodData = {
    // 1. 탄수화물 (기장밥 포함)
    "차조밥": "carb", "현미밥": "carb",  "검은콩밥": "carb", "클로렐라밥": "carb",
    "카레라이스": "carb", "애호박수제비": "carb", "스파게티": "carb", "국수": "carb", "떡국": "carb",
    "짜장밥": "carb", "비빔밥": "carb", "쇠고기콩나물밥": "carb", "보리밥": "carb",

    // 2. 단백질
    "불고기": "protein", "제육볶음": "protein", "수육": "protein", "돈가스": "protein", "함박스테이크": "protein",
    "닭갈비": "protein", "찜닭": "protein", "연어스테이크": "protein",
    "가자미": "protein", "고등어조림": "protein",
    "계란찜": "protein", "메추리알": "protein", "두부": "protein",

    // 3. 지방 및 토핑 (1/5 크기 적용 대상)
    "버터": ["fat", "topping"], 
    "마요네즈": ["fat", "topping"], 
    "견과류": ["fat", "topping"], 
    "아보카도": ["fat", "topping"],
    "베이컨": "fat", "훈제오리": "fat",

    // 4. 칼슘 및 미네랄 중복 적용
    "우유": "calcium", "요거트": "calcium", "치즈": "calcium", "멸치": "calcium", 
    "미역줄기": ["calcium", "mineral"],
    "검은콩": ["calcium", "mineral"],
    "톳": ["calcium", "mineral"],
    "시금치": ["calcium", "mineral"],
    "콩나물": ["calcium", "mineral"],
    "고사리": ["calcium", "mineral"],
   
    // 5. 무기질 및 기타
    "오이": "mineral", "당근": "mineral", "애호박": "mineral", "브로콜리": "mineral",
    "사과": "mineral", "고추된장무침": "mineral", "딸기": "mineral", "바나나": "mineral", "키위": "mineral", "토마토": "mineral",
    "김치": ["mineral", "salt"],   // 따옴표 수정 완료
    "깍두기": ["mineral", "salt"], // 따옴표 수정 완료

    // 6. 국 및 찌개류
    "소고기미역국": ["protein", "calcium", "mineral", "salt"],
    "된장찌개": ["protein", "mineral"],
    "쇠고기무국": ["protein", "mineral", "salt"],
    "어묵국": ["protein", "mineral"],
    "만둣국": ["carb", "protein"],
    "오징어무국": ["protein", "mineral", "salt"]
};