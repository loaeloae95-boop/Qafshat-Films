import UIKit
import UniformTypeIdentifiers

/// لوحة مفاتيح «قفشات أفلام»: شريط بحث + شبكة مقاطع MP4.
/// الضغط على مقطع ينسخه للحافظة العامة فيُلصق في واتساب/ماسنجر بضغطة «لصق».
final class KeyboardViewController: UIInputViewController {

    private let store = StickerStore()
    private var results: [Sticker] = []

    private let searchBar = UISearchBar()
    private var collectionView: UICollectionView!
    private let hintLabel = UILabel()
    private let nextKeyboardButton = UIButton(type: .system)

    override func viewDidLoad() {
        super.viewDidLoad()
        view.backgroundColor = UIColor(red: 0.06, green: 0.06, blue: 0.09, alpha: 1)
        semanticContentAttribute = .forceRightToLeft

        store.reload()
        results = store.all

        setupSearchBar()
        setupCollectionView()
        setupFooter()
        layout()
    }

    override func viewWillAppear(_ animated: Bool) {
        super.viewWillAppear(animated)
        store.reload()
        results = store.all
        collectionView.reloadData()
        updateHint()
    }

    // MARK: - UI

    private func setupSearchBar() {
        searchBar.placeholder = "ابحث عن قفشة…"
        searchBar.searchBarStyle = .minimal
        searchBar.delegate = self
        searchBar.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(searchBar)
    }

    private func setupCollectionView() {
        let layout = UICollectionViewFlowLayout()
        layout.minimumInteritemSpacing = 8
        layout.minimumLineSpacing = 8
        layout.sectionInset = UIEdgeInsets(top: 4, left: 10, bottom: 4, right: 10)

        collectionView = UICollectionView(frame: .zero, collectionViewLayout: layout)
        collectionView.backgroundColor = .clear
        collectionView.keyboardDismissMode = .none
        collectionView.dataSource = self
        collectionView.delegate = self
        collectionView.register(StickerCell.self, forCellWithReuseIdentifier: StickerCell.reuseID)
        collectionView.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(collectionView)
    }

    private func setupFooter() {
        hintLabel.font = .systemFont(ofSize: 11)
        hintLabel.textColor = .secondaryLabel
        hintLabel.textAlignment = .center
        hintLabel.numberOfLines = 2
        hintLabel.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(hintLabel)

        nextKeyboardButton.setTitle("🌐", for: .normal)
        nextKeyboardButton.titleLabel?.font = .systemFont(ofSize: 20)
        nextKeyboardButton.addTarget(self,
                                     action: #selector(handleInputModeList(from:with:)),
                                     for: .allTouchEvents)
        nextKeyboardButton.translatesAutoresizingMaskIntoConstraints = false
        view.addSubview(nextKeyboardButton)
    }

    private func layout() {
        NSLayoutConstraint.activate([
            view.heightAnchor.constraint(equalToConstant: 300),

            searchBar.topAnchor.constraint(equalTo: view.topAnchor, constant: 4),
            searchBar.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 6),
            searchBar.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -6),

            collectionView.topAnchor.constraint(equalTo: searchBar.bottomAnchor, constant: 4),
            collectionView.leadingAnchor.constraint(equalTo: view.leadingAnchor),
            collectionView.trailingAnchor.constraint(equalTo: view.trailingAnchor),
            collectionView.bottomAnchor.constraint(equalTo: hintLabel.topAnchor, constant: -4),

            hintLabel.leadingAnchor.constraint(equalTo: nextKeyboardButton.trailingAnchor, constant: 8),
            hintLabel.trailingAnchor.constraint(equalTo: view.trailingAnchor, constant: -10),
            hintLabel.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -8),

            nextKeyboardButton.leadingAnchor.constraint(equalTo: view.leadingAnchor, constant: 10),
            nextKeyboardButton.bottomAnchor.constraint(equalTo: view.bottomAnchor, constant: -6),
        ])
        updateHint()
    }

    private func updateHint() {
        if !hasFullAccess {
            hintLabel.text = "فعّل «السماح بالوصول الكامل» من الإعدادات لإرسال المقاطع"
        } else if results.isEmpty {
            hintLabel.text = "لا توجد قفشات محفوظة — افتح التطبيق واحفظ مقاطعك"
        } else {
            hintLabel.text = "اضغط على القفشة ثم «لصق» في المحادثة"
        }
    }

    // MARK: - Insert

    /// UITextDocumentProxy نصي فقط، لذلك ننسخ MP4 إلى الحافظة العامة
    /// ليلصقه المستخدم في واتساب أو ماسنجر (يتطلب Full Access).
    private func insert(_ sticker: Sticker) {
        guard hasFullAccess else {
            updateHint()
            return
        }
        guard let data = try? Data(contentsOf: sticker.fileURL) else {
            hintLabel.text = "تعذر فتح المقطع"
            return
        }

        let type = UTType.mpeg4Movie.identifier
        UIPasteboard.general.setItems(
            [[type: data]],
            options: [.localOnly: false, .expirationDate: Date().addingTimeInterval(600)]
        )

        UIImpactFeedbackGenerator(style: .light).impactOccurred()
        hintLabel.text = "تم نسخ «\(sticker.title)» — اضغط «لصق» في المحادثة"
    }
}

// MARK: - Search

extension KeyboardViewController: UISearchBarDelegate {
    func searchBar(_ searchBar: UISearchBar, textDidChange searchText: String) {
        results = store.search(searchText)
        collectionView.reloadData()
        updateHint()
    }

    func searchBarSearchButtonClicked(_ searchBar: UISearchBar) {
        searchBar.resignFirstResponder()
    }
}

// MARK: - Grid

extension KeyboardViewController: UICollectionViewDataSource, UICollectionViewDelegateFlowLayout {

    func collectionView(_ cv: UICollectionView, numberOfItemsInSection section: Int) -> Int {
        results.count
    }

    func collectionView(_ cv: UICollectionView, cellForItemAt indexPath: IndexPath) -> UICollectionViewCell {
        let cell = cv.dequeueReusableCell(withReuseIdentifier: StickerCell.reuseID, for: indexPath) as! StickerCell
        cell.configure(with: results[indexPath.item])
        return cell
    }

    func collectionView(_ cv: UICollectionView, didSelectItemAt indexPath: IndexPath) {
        insert(results[indexPath.item])
    }

    func collectionView(_ cv: UICollectionView,
                        layout: UICollectionViewLayout,
                        sizeForItemAt indexPath: IndexPath) -> CGSize {
        let columns: CGFloat = 4
        let spacing: CGFloat = 8
        let insets: CGFloat = 20
        let width = (cv.bounds.width - insets - spacing * (columns - 1)) / columns
        return CGSize(width: width, height: width + 16)
    }
}
